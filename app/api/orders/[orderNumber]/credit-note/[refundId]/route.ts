import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { archiveCreditNotePdf } from "@/modules/refunds/services/archive-credit-note-pdf.service";
import {
	CREDIT_NOTE_REFUND_SELECT,
	renderRefundCreditNotePdf,
} from "@/modules/refunds/services/render-refund-credit-note.service";
import { createOrderAudit } from "@/modules/orders/utils/order-audit";
import { isVerifiedAdmin } from "@/modules/auth/lib/require-auth";
import {
	orderNumberParamSchema,
	refundIdParamSchema,
} from "@/modules/orders/schemas/order-route-params.schema";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { GET_ORDER_SELECT_CUSTOMER } from "@/modules/orders/constants/order.constants";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { headers } from "next/headers";
import { ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { logger } from "@/shared/lib/logger";
import { isAllowedMediaDomain } from "@/shared/lib/media-validation";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import { OrderAction, HistorySource, RefundStatus } from "@/app/generated/prisma/client";

/**
 * Endpoint séparé pour télécharger un avoir (credit note) rattaché à un Refund.
 *
 * Distinct de `/api/orders/[orderNumber]/invoice` (facture). Permet à un client
 * de récupérer ses factures ET ses avoirs comme deux artefacts comptables
 * distincts (Art. 289 CGI).
 *
 * Auth : admin (audit) OU owner session. Pas de token guest (un guest peut
 * contacter le support pour obtenir l'avoir si nécessaire).
 *
 * Cf. audit avoirs 2026-05-28 — EINV-CREDIT-011.
 */

const UPLOADTHING_FETCH_TIMEOUT_MS = 5_000;

async function recordCreditNoteDownload(params: {
	orderId: string;
	refundId: string;
	creditNoteNumber: string;
	source: HistorySource;
}): Promise<void> {
	try {
		await createOrderAudit({
			orderId: params.orderId,
			action: OrderAction.INVOICE_DOWNLOADED,
			source: params.source,
			metadata: {
				creditNoteNumber: params.creditNoteNumber,
				refundId: params.refundId,
				isAdminContext: params.source === HistorySource.ADMIN,
				artifactType: "credit-note",
			},
		});
	} catch (error) {
		logger.warn("Failed to record CREDIT_NOTE INVOICE_DOWNLOADED audit (best-effort)", {
			service: "credit-note-route",
			orderId: params.orderId,
			refundId: params.refundId,
			source: params.source,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ orderNumber: string; refundId: string }> },
) {
	const { orderNumber, refundId } = await params;

	// F4 (audit Zod) : params bornés/formatés AVANT session/rate-limit/Prisma
	// (harmonisation avec status/route.ts). Échec → 400.
	if (
		!orderNumberParamSchema.safeParse(orderNumber).success ||
		!refundIdParamSchema.safeParse(refundId).success
	) {
		return new Response("Bad request", { status: 400 });
	}

	const session = await getSession();

	if (!session?.user.id) {
		return new Response("Non autorisé", { status: 401 });
	}

	// EINV-SEC-001 : re-vérification DB du rôle admin — le cookie-cache Better Auth
	// est stale, et le filtre couvre aussi `suspendedAt` / `accountStatus`.
	const isAdmin = await isVerifiedAdmin(session, "credit-note-route");

	const rateLimitConfig = isAdmin
		? ORDER_LIMITS.ADMIN_INVOICE_DOWNLOAD
		: ORDER_LIMITS.INVOICE_DOWNLOAD;
	const rateLimitIdentifier = isAdmin
		? `admin-credit-note:${session.user.id}`
		: getRateLimitIdentifier(session.user.id);
	// 3ᵉ argument obligatoire — cf. `/invoice` : l'identifiant est ici toujours
	// user-scopé, donc sans IP explicite le plafond global 100/min/IP ne s'applique
	// jamais et un compte unique peut saturer le CPU de génération PDF.
	const clientIp = await getClientIp(await headers());
	const rateCheck = await checkRateLimit(rateLimitIdentifier, rateLimitConfig, clientIp);
	if (!rateCheck.success) {
		return new Response("Trop de requêtes. Veuillez réessayer plus tard.", {
			status: 429,
			headers: { "Retry-After": String(rateCheck.retryAfter ?? 60) },
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
				tags: { route: "credit-note-refund", actor: "admin" },
				extra: {
					// Session obligatoire sur cette route (401 plus haut) : pas d'optional chain.
					adminUserId: session.user.id,
					remaining: rateCheck.remaining,
					limit: adminLimit,
				},
			});
		}
	}

	// Lookup order + refund
	const order = (await prisma.order.findFirst({
		where: { orderNumber, ...notDeleted },
		select: GET_ORDER_SELECT_CUSTOMER,
	})) as GetOrderReturn | null;
	if (!order) {
		return new Response("Commande introuvable", { status: 404 });
	}

	// EINV-SEC-003 : 404 indistinct (anti-énumération), cf. /invoice.
	//
	// Route ADMIN uniquement : elle n'a pas de chemin par token invité, et la
	// branche « propriétaire de session » a disparu avec `Order.userId`
	// (2026-08-05) — une commande n'a plus de propriétaire, l'achat est 100 %
	// invité. La seule session possible est celle de l'administratrice, déjà
	// couverte par `isAdmin`.
	if (!isAdmin) {
		return new Response("Commande introuvable", { status: 404 });
	}

	const refund = await prisma.refund.findFirst({
		where: { id: refundId, orderId: order.id },
		select: CREDIT_NOTE_REFUND_SELECT,
	});

	if (!refund) {
		return new Response("Avoir introuvable", { status: 404 });
	}

	if (refund.status !== RefundStatus.COMPLETED) {
		return new Response("Avoir non disponible (remboursement non finalisé)", { status: 400 });
	}

	if (!refund.creditNoteNumber || !refund.creditNoteGeneratedAt) {
		return new Response("Avoir non encore émis pour ce remboursement", { status: 404 });
	}

	// Route admin-only depuis le retrait de `Order.userId` : la branche CUSTOMER
	// était devenue inatteignable.
	const auditSource: HistorySource = HistorySource.ADMIN;

	// Servir le PDF archivé si présent (immuable, Art. L102 B LPF).
	if (refund.creditNotePdfUrl) {
		if (!isAllowedMediaDomain(refund.creditNotePdfUrl)) {
			logger.error("creditNotePdfUrl is not on UploadThing whitelist — refusing fetch", undefined, {
				service: "credit-note-route",
				refundId: refund.id,
			});
			return new Response("Configuration avoir invalide", { status: 500 });
		}

		try {
			const archived = await fetch(refund.creditNotePdfUrl, {
				cache: "no-store",
				signal: AbortSignal.timeout(UPLOADTHING_FETCH_TIMEOUT_MS),
			});
			if (archived.ok) {
				const buffer = await archived.arrayBuffer();
				// EINV-PDF-006 : re-vérifier l'empreinte de l'artefact servi contre le hash
				// archivé (Art. L102 B LPF) — cohérent avec /invoice et /credit-note (Order).
				// Divergence : on NE sert PAS l'octet douteux → bascule régénération
				// (re-vérifiée plus bas par EINV-PDF-002, 503 si elle diverge aussi).
				// Archives legacy sans hash : servies telles quelles.
				const servedHash =
					refund.creditNotePdfHash != null
						? createHash("sha256").update(new Uint8Array(buffer)).digest("hex")
						: null;
				if (servedHash !== null && servedHash !== refund.creditNotePdfHash) {
					logger.error(
						"Archived credit note PDF hash mismatch — falling back to regeneration",
						undefined,
						{
							service: "credit-note-route",
							refundId: refund.id,
							creditNoteNumber: refund.creditNoteNumber,
							archivedHash: refund.creditNotePdfHash,
							servedHash,
						},
					);
					Sentry.captureMessage("credit-note-pdf-archive-hash-mismatch", {
						level: "error",
						fingerprint: ["credit-note-refund", "archive-hash-mismatch", refund.creditNoteNumber],
						tags: { service: "credit-note-route" },
						extra: {
							orderId: order.id,
							refundId: refund.id,
							creditNoteNumber: refund.creditNoteNumber,
							archivedHash: refund.creditNotePdfHash,
							servedHash,
						},
					});
					// Pas de return : on tombe dans le bloc de régénération plus bas.
				} else {
					await recordCreditNoteDownload({
						orderId: order.id,
						refundId: refund.id,
						creditNoteNumber: refund.creditNoteNumber,
						source: auditSource,
					});
					return new Response(buffer, {
						headers: buildCreditNotePdfHeaders(refund.creditNoteNumber, orderNumber),
					});
				}
			} else {
				logger.warn(
					`Archived credit note fetch failed (${archived.status}) — falling back to regeneration`,
					{ service: "credit-note-route", refundId: refund.id },
				);
			}
		} catch (error) {
			logger.warn(`Archived credit note fetch threw — falling back to regeneration`, {
				service: "credit-note-route",
				refundId: refund.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// Régénération à la volée + archivage best-effort. SSOT du rendu
	// (EINV-CREDIT-020) : `renderRefundCreditNotePdf` est le même chemin que
	// l'archivage eager post-`issueCreditNoteForRefund` et le cron
	// `reconcile-invoices` — un PDF régénéré doit rester bit-identique au hash
	// archivé (Art. L102 B LPF).
	const rendered = await renderRefundCreditNotePdf(refund.id);
	if (!rendered) {
		// État incohérent (les gardes ci-dessus ont validé creditNoteNumber) —
		// probablement une course avec une suppression/purge concurrente.
		return new Response("Avoir non disponible pour ce remboursement", { status: 404 });
	}
	const pdfBuffer = rendered.pdfBuffer;

	// EINV-PDF-002 : check hash divergence si déjà archivé (cas où le fetch
	// UploadThing a échoué mais qu'on a quand même le hash).
	if (refund.creditNotePdfHash) {
		const regeneratedHash = createHash("sha256").update(new Uint8Array(pdfBuffer)).digest("hex");
		if (regeneratedHash !== refund.creditNotePdfHash) {
			logger.error(
				"Regenerated credit note PDF hash diverges from archived hash — refusing to serve",
				undefined,
				{
					service: "credit-note-route",
					refundId: refund.id,
					creditNoteNumber: refund.creditNoteNumber,
					archivedHash: refund.creditNotePdfHash,
					regeneratedHash,
				},
			);
			Sentry.captureMessage("credit-note-pdf-hash-divergence", {
				level: "error",
				fingerprint: ["credit-note", "hash-mismatch", refund.creditNoteNumber],
				tags: { service: "credit-note-route" },
				extra: {
					orderId: order.id,
					refundId: refund.id,
					creditNoteNumber: refund.creditNoteNumber,
					archivedHash: refund.creditNotePdfHash,
					regeneratedHash,
				},
			});
			return new Response(
				"Avoir temporairement indisponible (vérification d'intégrité en cours).",
				{ status: 503, headers: { "Retry-After": "60" } },
			);
		}
	}

	// Archivage best-effort post-rendu.
	await archiveCreditNotePdf(refund.id, refund.creditNoteNumber, pdfBuffer);

	await recordCreditNoteDownload({
		orderId: order.id,
		refundId: refund.id,
		creditNoteNumber: refund.creditNoteNumber,
		source: auditSource,
	});

	return new Response(pdfBuffer, {
		headers: buildCreditNotePdfHeaders(refund.creditNoteNumber, orderNumber),
	});
}

function buildCreditNotePdfHeaders(creditNoteNumber: string, orderNumber: string): HeadersInit {
	const filename = `avoir-${creditNoteNumber}.pdf`;
	return {
		"Content-Type": "application/pdf",
		"Content-Disposition": `attachment; filename="${filename}"`,
		"Cache-Control": "private, max-age=31536000, immutable",
		"X-Frame-Options": "DENY",
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": "no-referrer",
		"X-Order-Number": orderNumber,
	};
}
