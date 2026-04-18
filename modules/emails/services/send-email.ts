import { createHash } from "node:crypto";
import { render } from "@react-email/components";
import { Resend } from "resend";
import { withRetry } from "@/shared/utils/with-retry";
import { resendCircuitBreaker, CircuitBreakerError } from "@/shared/lib/circuit-breaker";
import { logger } from "@/shared/lib/logger";
import { EMAIL_CONTACT, EMAIL_FROM } from "../constants/email.constants";
import type { EmailResult } from "../types/email.types";

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
	// Resend API errors with statusCode
	if (typeof error === "object" && error !== null && "statusCode" in error) {
		const statusCode = (error as { statusCode: number }).statusCode;
		return statusCode >= 500;
	}
	return false;
}

/**
 * Construit les headers List-Unsubscribe conformes RFC 8058 (one-click).
 * Requis par Gmail et Yahoo depuis février 2024 pour tout bulk sender (>5000 emails/jour).
 *
 * Applique aux catégories commerciales/marketing où une opt-out est attendue :
 * newsletter, marketing, review. Les emails transactionnels (order, payment, auth)
 * ne doivent PAS avoir de List-Unsubscribe — Gmail peut les flagger comme non transactionnels.
 */
function buildUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
	return {
		"List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${EMAIL_CONTACT}?subject=unsubscribe>`,
		"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
	};
}

export async function sendEmail(params: {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
	headers?: Record<string, string>;
	tags?: Array<{ name: string; value: string }>;
	/**
	 * URL de désinscription one-click. Si fournie, ajoute les headers
	 * List-Unsubscribe + List-Unsubscribe-Post (RFC 8058). À utiliser
	 * pour les emails commerciaux (newsletter, marketing, review).
	 */
	unsubscribeUrl?: string;
	/**
	 * Skip cross-process idempotence via EmailLog. Use for broadcast emails
	 * (newsletter blasts) where dedup would prevent legitimate re-sends.
	 * Default: false (idempotence enforced).
	 */
	skipIdempotence?: boolean;
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
		...(params.unsubscribeUrl ? buildUnsubscribeHeaders(params.unsubscribeUrl) : {}),
		...params.headers,
	};

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

	try {
		const { data, error } = await resendCircuitBreaker.execute(() =>
			withRetry(
				async () => {
					const { unsubscribeUrl: _unsub, headers: _h, skipIdempotence: _si, ...rest } = params;
					const result = await resend.emails.send({
						from: EMAIL_FROM,
						...rest,
						...(Object.keys(mergedHeaders).length > 0 ? { headers: mergedHeaders } : {}),
					});
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
			logger.error("Failed to send email", error, {
				service: "send-email",
				subject: params.subject,
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
		logger.error("Failed to send email", error, { service: "send-email", subject: params.subject });
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
