import { createHash } from "node:crypto";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { archiveCreditNotePdf } from "@/modules/orders/services/archive-credit-note-pdf.service";
import { renderOrderCreditNotePdf } from "@/modules/orders/services/render-order-credit-note.service";
import { verifyInvoiceAccessToken } from "@/modules/orders/utils/invoice-token";
import {
	orderNumberParamSchema,
	invoiceTokenSchema,
} from "@/modules/orders/schemas/order-route-params.schema";
import { isVerifiedAdmin } from "@/modules/auth/lib/require-auth";
import { createOrderAudit } from "@/modules/orders/utils/order-audit";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { GET_ORDER_SELECT_CUSTOMER } from "@/modules/orders/constants/order.constants";
import { checkRateLimit, getRateLimitIdentifier, getClientIp } from "@/shared/lib/rate-limit";
import { ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { logger } from "@/shared/lib/logger";
import { isAllowedMediaDomain } from "@/shared/lib/media-validation";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import { OrderAction, HistorySource } from "@/app/generated/prisma/client";

const UPLOADTHING_FETCH_TIMEOUT_MS = 5_000;

/**
 * Audit RGPD Art. 30/32 : trace chaque accès avoir réussi. Le PDF de l'avoir
 * a la même criticité que la facture (document fiscal Art. L102 B LPF). On
 * réutilise l'action `INVOICE_DOWNLOADED` avec `documentType: "CREDIT_NOTE"` —
 * pas de nouvel enum requis (cf. justification CLAUDE.md « ne pas designer
 * pour des cas hypothétiques »).
 */
async function recordCreditNoteDownload(params: {
	orderId: string;
	creditNoteNumber: string;
	authorId: string | undefined;
	source: HistorySource;
}): Promise<void> {
	try {
		await createOrderAudit({
			orderId: params.orderId,
			action: OrderAction.INVOICE_DOWNLOADED,
			authorId: params.authorId,
			source: params.source,
			metadata: {
				documentType: "CREDIT_NOTE",
				creditNoteNumber: params.creditNoteNumber,
				isAdminContext: params.source === HistorySource.ADMIN,
			},
		});
		Sentry.addBreadcrumb({
			category: "credit-note",
			message: "credit-note-downloaded",
			level: "info",
			data: {
				orderId: params.orderId,
				source: params.source,
				creditNoteNumber: params.creditNoteNumber,
			},
		});
	} catch (error) {
		logger.warn("Failed to record CREDIT_NOTE_DOWNLOADED audit (best-effort)", {
			service: "credit-note-route",
			orderId: params.orderId,
			source: params.source,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ orderNumber: string }> },
) {
	const { orderNumber } = await params;
	const url = new URL(request.url);

	// F4 (audit Zod) : params bornés/formatés AVANT session/rate-limit/Prisma
	// (harmonisation avec status/route.ts). Échec → 400.
	const orderNumberValidation = orderNumberParamSchema.safeParse(orderNumber);
	const tokenValidation = invoiceTokenSchema.safeParse(url.searchParams.get("token"));
	if (!orderNumberValidation.success || !tokenValidation.success) {
		return new Response("Bad request", { status: 400 });
	}
	const tokenFromQuery = tokenValidation.data;

	const session = await getSession();

	if (!session?.user.id && !tokenFromQuery) {
		return new Response("Non autorisé", { status: 401 });
	}

	// EINV-SEC-001 : `session.user.role` est best-effort (cookie-cache Better Auth).
	// Re-vérification DB partagée avec /invoice — un admin démoté OU SUSPENDU ne doit
	// pas conserver le bypass d'ownership ni le quota 200/h sur les avoirs.
	const isAdmin = await isVerifiedAdmin(session, "credit-note-route");

	// Rate limit : même profil CPU/I/O que /invoice (génération PDF jsPDF +
	// upload UploadThing), on partage les configs ORDER_LIMITS.INVOICE_DOWNLOAD
	// et ADMIN_INVOICE_DOWNLOAD. Pas de quota séparé : un client malveillant
	// alternant /invoice et /credit-note resterait sous le même cap effectif.
	const headersList = await headers();
	const clientIp = await getClientIp(headersList);
	const rateLimitConfig = isAdmin
		? ORDER_LIMITS.ADMIN_INVOICE_DOWNLOAD
		: ORDER_LIMITS.INVOICE_DOWNLOAD;
	const rateLimitIdentifier = session?.user.id
		? isAdmin
			? `admin-invoice:${session.user.id}`
			: getRateLimitIdentifier(session.user.id)
		: `invoice-token:${clientIp ?? "unknown"}`;
	// 3ᵉ argument obligatoire — cf. `/invoice` : sans lui le plafond global 100/min/IP,
	// la whitelist et la blacklist sont inertes sur ce chemin.
	const rateCheck = await checkRateLimit(rateLimitIdentifier, rateLimitConfig, clientIp);
	if (!rateCheck.success) {
		if (isAdmin) {
			Sentry.captureMessage("admin-credit-note-download-rate-limited", {
				level: "warning",
				tags: { route: "credit-note", actor: "admin" },
				extra: {
					adminUserId: session?.user.id,
					limit: rateLimitConfig.limit,
					windowMs: rateLimitConfig.windowMs,
				},
			});
		}
		return new Response("Trop de requêtes. Veuillez réessayer plus tard.", {
			status: 429,
			headers: {
				"Retry-After": String(rateCheck.retryAfter ?? 60),
			},
		});
	}

	// Alerte proactive d'épuisement de quota admin (parité avec /invoice) : un admin
	// qui s'approche de sa borne signale soit un script en boucle, soit un besoin
	// légitime de relever la limite. Sans ça, on ne le découvrait qu'au premier 429.
	if (isAdmin) {
		const adminLimit = rateLimitConfig.limit ?? 200;
		if (rateCheck.remaining <= Math.floor(adminLimit * 0.2)) {
			Sentry.captureMessage("admin-credit-note-download-quota-warning", {
				level: "warning",
				tags: { route: "credit-note", actor: "admin" },
				extra: {
					adminUserId: session?.user.id,
					remaining: rateCheck.remaining,
					limit: adminLimit,
				},
			});
		}
	}

	const order = (await prisma.order.findFirst({
		where: { orderNumber, ...notDeleted },
		select: GET_ORDER_SELECT_CUSTOMER,
	})) as GetOrderReturn | null;
	if (!order) {
		return new Response("Commande introuvable", { status: 404 });
	}

	const tokenValid =
		tokenFromQuery !== null &&
		verifyInvoiceAccessToken(order.id, order.orderNumber, tokenFromQuery);
	// EINV-SEC-003 : 404 indistinct (anti-énumération), cf. /invoice.
	if (!isAdmin && !tokenValid) {
		return new Response("Commande introuvable", { status: 404 });
	}

	// Garde fondamentale : pas de génération lazy d'avoir. Contrairement à la
	// facture (qui peut être créée au 1er download si le webhook a échoué),
	// l'avoir est émis explicitement par `voidInvoice` (cancel-order /
	// mark-as-fully-refunded / charge.refunded webhook). Si `creditNoteNumber`
	// est null, l'avoir n'existe pas — point.
	if (!order.creditNoteNumber || !order.creditNoteGeneratedAt || !order.invoiceNumber) {
		return new Response("Avoir non disponible pour cette commande", { status: 404 });
	}

	const archive = await prisma.order.findUnique({
		where: { id: order.id },
		select: { creditNotePdfUrl: true, creditNotePdfHash: true, piiPurgedAt: true },
	});

	// F6 (RGPD-PII-AUDIT 2026-05-30) : symétrie avec la route facture — après la purge
	// PII à 10 ans (hard-delete-retention), l'avoir n'est plus reconstituable (snapshot +
	// PDF archivé effacés, base légale expirée RGPD Art. 5.1.e). On renvoie 410 Gone au
	// lieu de régénérer depuis des colonnes Order scrubées.
	if (archive?.piiPurgedAt) {
		return new Response(
			"Ce document n'est plus disponible : la durée légale de conservation (10 ans) a expiré.",
			{ status: 410 },
		);
	}
	const auditSource: HistorySource = isAdmin ? HistorySource.ADMIN : HistorySource.CUSTOMER;
	const auditAuthorId = session?.user.id;

	type CreditNotePath = "archived" | "lazy_regenerate";
	let creditNotePath: CreditNotePath = "archived";

	if (archive?.creditNotePdfUrl) {
		// Whitelist host UploadThing avant fetch (anti-SSRF — cohérent avec /invoice).
		if (!isAllowedMediaDomain(archive.creditNotePdfUrl)) {
			logger.error("creditNotePdfUrl is not on UploadThing whitelist — refusing fetch", undefined, {
				service: "credit-note-route",
				orderId: order.id,
				host: safeHostname(archive.creditNotePdfUrl),
			});
			Sentry.captureMessage("credit-note-pdf-url-host-not-whitelisted", {
				level: "error",
				tags: { service: "credit-note-route" },
				extra: { orderId: order.id, host: safeHostname(archive.creditNotePdfUrl) },
			});
			return new Response("Configuration avoir invalide", { status: 500 });
		}

		try {
			const archived = await fetch(archive.creditNotePdfUrl, {
				cache: "no-store",
				signal: AbortSignal.timeout(UPLOADTHING_FETCH_TIMEOUT_MS),
			});
			if (archived.ok) {
				const buffer = await archived.arrayBuffer();
				// EINV-PDF-006 : re-vérifier l'empreinte de l'artefact servi contre le hash
				// archivé (Art. L102 B LPF) — cohérent avec /invoice. Le `creditNotePdfHash`
				// n'était vérifié que sur le fallback regen (:249) ; ici on couvre le chemin
				// de lecture réel contre une corruption/altération CDN. Divergence : on NE
				// sert PAS l'octet douteux → bascule régénération (re-vérifiée plus bas,
				// 503 si elle diverge). Archives legacy sans hash : servies telles quelles.
				const servedHash =
					archive.creditNotePdfHash != null
						? createHash("sha256").update(new Uint8Array(buffer)).digest("hex")
						: null;
				if (servedHash !== null && servedHash !== archive.creditNotePdfHash) {
					logger.error(
						"Archived credit note PDF hash mismatch — falling back to regeneration",
						undefined,
						{
							service: "credit-note-route",
							orderId: order.id,
							creditNoteNumber: order.creditNoteNumber,
							archivedHash: archive.creditNotePdfHash,
							servedHash,
						},
					);
					Sentry.captureMessage("credit-note-pdf-archive-hash-mismatch", {
						level: "error",
						fingerprint: ["credit-note", "archive-hash-mismatch", order.creditNoteNumber],
						tags: { service: "credit-note-route" },
						extra: {
							orderId: order.id,
							creditNoteNumber: order.creditNoteNumber,
							archivedHash: archive.creditNotePdfHash,
							servedHash,
						},
					});
					creditNotePath = "lazy_regenerate";
					// Pas de return : on tombe dans le bloc de régénération existant plus bas.
				} else {
					Sentry.setTag("credit_note_path", creditNotePath);
					await recordCreditNoteDownload({
						orderId: order.id,
						creditNoteNumber: order.creditNoteNumber,
						authorId: auditAuthorId,
						source: auditSource,
					});
					return new Response(buffer, {
						headers: buildPdfHeaders(order.creditNoteNumber, orderNumber),
					});
				}
			}
			creditNotePath = "lazy_regenerate";
			logger.warn(
				`Archived credit note fetch failed (${archived.status}) — falling back to regeneration`,
				{ service: "credit-note-route", orderId: order.id },
			);
		} catch (error) {
			creditNotePath = "lazy_regenerate";
			logger.warn(`Archived credit note fetch threw — falling back to regeneration`, {
				service: "credit-note-route",
				orderId: order.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	} else {
		creditNotePath = "lazy_regenerate";
	}

	// SSOT du rendu avoir (EINV-CREDIT-020) : `renderOrderCreditNotePdf` est le
	// MÊME chemin que l'archivage eager post-`voidInvoice` et le cron
	// `reconcile-invoices` — motif dérivé du dernier OrderHistory INVOICE_VOIDED,
	// `precedingInvoice` vers la facture annulée (Art. 272-I CGI). Indispensable
	// pour que la régénération reste bit-identique au hash archivé (L102 B LPF).
	const rendered = await renderOrderCreditNotePdf(order.id);
	if (!rendered) {
		// État incohérent (les gardes ci-dessus ont validé creditNoteNumber) —
		// probablement une course avec une purge/suppression concurrente.
		return new Response("Avoir non disponible pour cette commande", { status: 404 });
	}
	const pdfBuffer = rendered.pdfBuffer;

	// Si une archive existe avec un hash connu, le PDF régénéré doit matcher
	// bit-à-bit (Art. L102 B LPF). Sinon : 503 plutôt que servir un PDF qui
	// diverge du document comptable archivé.
	if (archive?.creditNotePdfHash) {
		const regeneratedHash = createHash("sha256").update(new Uint8Array(pdfBuffer)).digest("hex");
		if (regeneratedHash !== archive.creditNotePdfHash) {
			logger.error(
				"Regenerated credit note PDF hash diverges from archived hash — refusing to serve",
				undefined,
				{
					service: "credit-note-route",
					orderId: order.id,
					creditNoteNumber: order.creditNoteNumber,
					archivedHash: archive.creditNotePdfHash,
					regeneratedHash,
				},
			);
			Sentry.captureMessage("credit-note-pdf-hash-divergence", {
				level: "error",
				fingerprint: ["credit-note", "hash-mismatch", order.creditNoteNumber],
				tags: { service: "credit-note-route" },
				extra: {
					orderId: order.id,
					creditNoteNumber: order.creditNoteNumber,
					archivedHash: archive.creditNotePdfHash,
					regeneratedHash,
				},
			});
			return new Response(
				"Avoir temporairement indisponible (vérification d'intégrité en cours).",
				{
					status: 503,
					headers: { "Retry-After": "60" },
				},
			);
		}
	}

	// Archive best-effort (idempotent — si déjà uploadé, retourne l'existant).
	await archiveCreditNotePdf(order.id, order.creditNoteNumber, pdfBuffer);

	Sentry.setTag("credit_note_path", creditNotePath);
	Sentry.addBreadcrumb({
		category: "credit-note",
		level: "warning",
		message: `Credit note served via ${creditNotePath}`,
		data: { orderId: order.id, creditNotePath },
	});

	await recordCreditNoteDownload({
		orderId: order.id,
		creditNoteNumber: order.creditNoteNumber,
		authorId: auditAuthorId,
		source: auditSource,
	});

	return new Response(pdfBuffer, {
		headers: buildPdfHeaders(order.creditNoteNumber, orderNumber),
	});
}

function safeHostname(rawUrl: string): string {
	try {
		return new URL(rawUrl).hostname;
	} catch {
		return "<invalid-url>";
	}
}

function buildPdfHeaders(creditNoteNumber: string, orderNumber: string): HeadersInit {
	const filename = `avoir-${creditNoteNumber || orderNumber}.pdf`;
	return {
		"Content-Type": "application/pdf",
		"Content-Disposition": `attachment; filename="${filename}"`,
		"Cache-Control": "private, max-age=31536000, immutable",
		"X-Frame-Options": "DENY",
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": "no-referrer",
	};
}
