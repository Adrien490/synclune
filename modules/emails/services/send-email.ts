import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { render } from "react-email";
import { Resend } from "resend";
import { withRetry } from "@/shared/utils/with-retry";
import { resendCircuitBreaker, CircuitBreakerError } from "@/shared/lib/circuit-breaker";
import { logger } from "@/shared/lib/logger";
import {
	EMAIL_ADMIN,
	EMAIL_ADMIN_BCC,
	EMAIL_CONTACT,
	EMAIL_FROM,
} from "../constants/email.constants";
import type { EmailResult } from "../types/email.types";

/**
 * EMAIL-AUDIT-007 : classifie le type d'erreur pour grouping Sentry (fingerprint).
 * Évite que chaque "Resend 500" crée un événement séparé.
 */
function classifyEmailError(error: unknown): string {
	if (error instanceof CircuitBreakerError) return "circuit-breaker-open";
	if (typeof error === "object" && error !== null) {
		if ("name" in error) {
			const name = (error as { name: unknown }).name;
			if (typeof name === "string" && name.length > 0) return name;
		}
		if ("statusCode" in error) {
			const statusCode = (error as { statusCode: unknown }).statusCode;
			if (typeof statusCode === "number") return `http-${statusCode}`;
		}
	}
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		if (message.includes("timeout")) return "timeout";
		if (message.includes("network") || message.includes("fetch")) return "network";
		if (message.includes("econnrefused")) return "econnrefused";
	}
	return "unknown";
}

/**
 * Generates a stable SHA-256 hash for in-process email dedup.
 * Uses recipient + subject + first 4KB of html (enough to distinguish
 * templates while keeping the hash computation fast).
 */
function computeEmailContentHash(to: string | string[], subject: string, html: string): string {
	const recipient = Array.isArray(to) ? to.slice().sort().join(",") : to;
	const htmlSnippet = html.slice(0, 4096);
	return createHash("sha256").update(`${recipient}|${subject}|${htmlSnippet}`).digest("hex");
}

/**
 * In-process LRU cache for recently-sent email hashes (idempotence guard).
 *
 * Protects against accidental doubles within the same serverless instance
 * lifecycle (cron retry + webhook callback on the same email, double-fire
 * within a request). TTL 10 minutes — typical Resend retry window.
 *
 * Trade-off vs a DB table: lost on instance restart, not shared across
 * serverless cold starts. Acceptable because Resend already has server-side
 * dedup and the common failure mode (double-fire) happens in-process.
 */
const EMAIL_DEDUP_TTL_MS = 10 * 60 * 1000;
const EMAIL_DEDUP_MAX_ENTRIES = 1000;
const emailDedupCache = new Map<string, { resendId: string; sentAt: number }>();

function pruneEmailDedupCache(): void {
	const now = Date.now();
	for (const [hash, entry] of emailDedupCache) {
		if (now - entry.sentAt > EMAIL_DEDUP_TTL_MS) {
			emailDedupCache.delete(hash);
		}
	}
	// Hard cap (simple FIFO drop if still over after TTL prune)
	while (emailDedupCache.size > EMAIL_DEDUP_MAX_ENTRIES) {
		const oldestKey = emailDedupCache.keys().next().value;
		if (!oldestKey) break;
		emailDedupCache.delete(oldestKey);
	}
}

function lookupEmailDedup(contentHash: string): { resendId: string; sentAt: number } | null {
	const entry = emailDedupCache.get(contentHash);
	if (!entry) return null;
	if (Date.now() - entry.sentAt > EMAIL_DEDUP_TTL_MS) {
		emailDedupCache.delete(contentHash);
		return null;
	}
	return entry;
}

function recordEmailSent(contentHash: string, resendId: string): void {
	pruneEmailDedupCache();
	emailDedupCache.set(contentHash, { resendId, sentAt: Date.now() });
}

/** Test-only helper: clear the in-process dedup cache between tests. */
export function __resetEmailDedupCacheForTests(): void {
	emailDedupCache.clear();
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
	if (!process.env.RESEND_API_KEY) return null;
	resendClient ??= new Resend(process.env.RESEND_API_KEY);
	return resendClient;
}

function isRetryableEmailError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		if (
			message.includes("fetch") ||
			message.includes("network") ||
			message.includes("timeout") ||
			message.includes("econnrefused")
		) {
			return true;
		}
	}
	// Resend nomme certaines erreurs (ex: rate_limit_exceeded) au lieu de statusCode
	if (typeof error === "object" && error !== null && "name" in error) {
		const name = (error as { name: unknown }).name;
		if (typeof name === "string" && name === "rate_limit_exceeded") {
			return true;
		}
	}
	// Resend API errors with statusCode : 5xx ou 429 (rate limit)
	// EMAIL-AUDIT-005 : 429 ajouté pour préserver les emails pendant un burst.
	if (typeof error === "object" && error !== null && "statusCode" in error) {
		const statusCode = (error as { statusCode: number }).statusCode;
		return statusCode >= 500 || statusCode === 429;
	}
	return false;
}

/**
 * Construit les headers marketing conformes RFC 8058 (one-click) + RFC 3834 (auto-responder).
 * Requis par Gmail et Yahoo depuis février 2024 pour tout bulk sender (>5000 emails/jour).
 *
 * Applique aux catégories commerciales/marketing où une opt-out est attendue :
 * marketing, review. Les emails transactionnels (order, payment, auth)
 * ne doivent PAS avoir de List-Unsubscribe — Gmail peut les flagger comme non transactionnels.
 *
 * EMAIL-AUDIT-009 : ajout Precedence: bulk + Auto-Submitted: auto-generated pour
 * empêcher les vacation replies / auto-responders de répondre.
 */
function buildMarketingHeaders(unsubscribeUrl: string): Record<string, string> {
	return {
		"List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${EMAIL_CONTACT}?subject=unsubscribe>`,
		"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		Precedence: "bulk",
		"Auto-Submitted": "auto-generated",
	};
}

export async function sendEmail(params: {
	to: string | string[];
	bcc?: string | string[];
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
	headers?: Record<string, string>;
	tags?: Array<{ name: string; value: string }>;
	/**
	 * URL de désinscription one-click. Si fournie, ajoute les headers
	 * List-Unsubscribe + List-Unsubscribe-Post (RFC 8058). À utiliser
	 * pour les emails commerciaux (marketing, review).
	 */
	unsubscribeUrl?: string;
	/**
	 * Court-circuite le cache de dédup IN-PROCESS (hash `to+subject+html[0:4096]`,
	 * TTL 10 min). À utiliser quand un renvoi à l'identique est précisément
	 * l'intention (action admin « renvoyer l'email »), sinon le cache renvoie
	 * l'ancien `resendId` en succès SANS réexpédier — sur instance chaude.
	 *
	 * N'affecte PAS la dédup Resend 24h : celle-ci dépend d'`idempotencyKey`,
	 * qu'il faut omettre séparément.
	 *
	 * Default: false (dédup active).
	 *
	 * NB : la JSDoc mentionnait une idempotence « cross-process via EmailLog ».
	 * Aucune table `EmailLog` n'existe ni n'a existé — la dédup cross-process
	 * repose uniquement sur `idempotencyKey` (Resend, 24h) et sur les flags DB
	 * par entité (ex. `Refund.confirmationEmailSentAt`).
	 */
	skipIdempotence?: boolean;
	/**
	 * Cross-instance idempotency key forwarded to Resend as `Idempotency-Key`
	 * header. Resend deduplicates server-side over a 24h window: two calls
	 * with the same key + recipient return the same `id` without re-sending.
	 *
	 * Use for cron jobs where the same logical email can be retried across
	 * serverless instances (the in-process dedup cache is per-instance).
	 * Example : `review-request:${orderId}`.
	 */
	idempotencyKey?: string;
}): Promise<EmailResult> {
	if (!params.to || (Array.isArray(params.to) && params.to.length === 0)) {
		logger.error("Missing recipient", undefined, { service: "send-email" });
		return { success: false, error: "Missing recipient" };
	}

	const resend = getResendClient();
	if (!resend) {
		logger.error("RESEND_API_KEY not configured", undefined, { service: "send-email" });
		return { success: false, error: "RESEND_API_KEY not configured" };
	}

	const mergedHeaders: Record<string, string> = {
		...(params.unsubscribeUrl ? buildMarketingHeaders(params.unsubscribeUrl) : {}),
		...params.headers,
	};

	// Auto-inject EMAIL_ADMIN_BCC on admin alerts (refund failed, sequence
	// overflow, dispute, etc.) so a fallback human receives them even if the
	// primary admin mailbox is down. No-op when EMAIL_ADMIN_BCC is unset or
	// the caller already provided a `bcc`.
	const resolvedBcc =
		params.bcc ?? (EMAIL_ADMIN_BCC && params.to === EMAIL_ADMIN ? EMAIL_ADMIN_BCC : undefined);

	// In-process idempotence: skip if same content was just sent.
	// Guards against accidental double-fire (cron retry + webhook callback
	// hitting the same email within seconds).
	const contentHash = computeEmailContentHash(params.to, params.subject, params.html);

	if (!params.skipIdempotence) {
		const existing = lookupEmailDedup(contentHash);
		if (existing) {
			logger.info("Email skipped (already sent, idempotent)", {
				service: "send-email",
				subject: params.subject,
				contentHash,
				sentAt: new Date(existing.sentAt).toISOString(),
			});
			return { success: true, data: { id: existing.resendId } };
		}
	}

	// EMAIL-AUDIT-007 : breadcrumb Sentry pour tracer la chaîne d'événements
	// (utile pour diagnostiquer ordering bug, webhook → cron → manual retry).
	const emailCategory = params.tags?.find((t) => t.name === "category")?.value;
	Sentry.addBreadcrumb({
		category: "email",
		level: "info",
		message: `send-email: ${params.subject}`,
		data: {
			subject: params.subject,
			category: emailCategory,
			hasIdempotencyKey: Boolean(params.idempotencyKey),
			hasUnsubscribeUrl: Boolean(params.unsubscribeUrl),
		},
	});

	try {
		const { data, error } = await resendCircuitBreaker.execute(() =>
			withRetry(
				async () => {
					const {
						unsubscribeUrl: _unsub,
						headers: _h,
						skipIdempotence: _si,
						idempotencyKey: _ik,
						bcc: _bcc,
						...rest
					} = params;
					const result = await resend.emails.send(
						{
							from: EMAIL_FROM,
							...rest,
							...(resolvedBcc !== undefined ? { bcc: resolvedBcc } : {}),
							...(Object.keys(mergedHeaders).length > 0 ? { headers: mergedHeaders } : {}),
						},
						params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
					);
					if (result.error && isRetryableEmailError(result.error)) {
						throw result.error;
					}
					return result;
				},
				{
					maxAttempts: 3,
					baseDelay: 1000,
					isRetryable: isRetryableEmailError,
				},
			),
		);
		if (error) {
			// EMAIL-AUDIT-007 : fingerprint stable pour grouping Sentry par type d'erreur.
			Sentry.withScope((scope) => {
				scope.setFingerprint(["email", params.subject, classifyEmailError(error)]);
				if (emailCategory) scope.setTag("email_category", emailCategory);
				if (params.idempotencyKey) scope.setTag("email_idempotency_key", params.idempotencyKey);
				logger.error("Failed to send email", error, {
					service: "send-email",
					subject: params.subject,
				});
			});
			return { success: false, error };
		}

		// Record the sent hash for in-process dedup
		if (!params.skipIdempotence && data.id) {
			recordEmailSent(contentHash, data.id);
		}

		logger.info("Email sent successfully", { service: "send-email", subject: params.subject });
		return { success: true, data: data! };
	} catch (error) {
		if (error instanceof CircuitBreakerError) {
			logger.warn("Circuit breaker OPEN, skipping email", {
				service: "send-email",
				subject: params.subject,
			});
			return { success: false, error: "Email service temporarily unavailable" };
		}
		Sentry.withScope((scope) => {
			scope.setFingerprint(["email", params.subject, classifyEmailError(error)]);
			if (emailCategory) scope.setTag("email_category", emailCategory);
			if (params.idempotencyKey) scope.setTag("email_idempotency_key", params.idempotencyKey);
			logger.error("Failed to send email", error, {
				service: "send-email",
				subject: params.subject,
			});
		});
		return { success: false, error };
	}
}

/**
 * Renders a React Email component to HTML/text and sends it via Resend
 */
export async function renderAndSend(
	component: React.ReactElement,
	params: Omit<Parameters<typeof sendEmail>[0], "html" | "text">,
): Promise<EmailResult> {
	if (!params.to || (Array.isArray(params.to) && params.to.length === 0)) {
		logger.error("Missing recipient", undefined, { service: "send-email" });
		return { success: false, error: "Missing recipient" };
	}

	let html: string;
	let text: string;
	try {
		html = await render(component);
		text = await render(component, { plainText: true });
	} catch (renderError) {
		logger.error("Failed to render email template", renderError, {
			service: "send-email",
			subject: params.subject,
		});
		return { success: false, error: renderError };
	}
	return sendEmail({ ...params, html, text });
}
