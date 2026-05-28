import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { buildCreditNoteData } from "@/modules/invoices/services/build-credit-note-data";
import { renderInvoicePdf } from "@/modules/invoices/services/render-invoice-pdf";
import { archiveCreditNotePdf } from "@/modules/refunds/services/archive-credit-note-pdf.service";
import { createOrderAudit } from "@/modules/orders/utils/order-audit";
import { resolveInvoiceActorIsAdmin } from "@/modules/orders/utils/resolve-invoice-admin";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { GET_ORDER_SELECT_CUSTOMER } from "@/modules/orders/constants/order.constants";
import { checkRateLimit, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
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

	const session = await getSession();

	if (!session?.user.id) {
		return new Response("Non autorisé", { status: 401 });
	}

	// EINV-SEC-001 : re-vérification DB du rôle admin (cookie-cache stale ~5 min).
	const isAdmin = await resolveInvoiceActorIsAdmin(session, "credit-note-route");

	const rateLimitConfig = isAdmin
		? ORDER_LIMITS.ADMIN_INVOICE_DOWNLOAD
		: ORDER_LIMITS.INVOICE_DOWNLOAD;
	const rateLimitIdentifier = isAdmin
		? `admin-credit-note:${session.user.id}`
		: getRateLimitIdentifier(session.user.id);
	const rateCheck = await checkRateLimit(rateLimitIdentifier, rateLimitConfig);
	if (!rateCheck.success) {
		return new Response("Trop de requêtes. Veuillez réessayer plus tard.", {
			status: 429,
			headers: { "Retry-After": String(rateCheck.retryAfter ?? 60) },
		});
	}

	// Lookup order + refund
	const order = (await prisma.order.findFirst({
		where: { orderNumber, ...notDeleted },
		select: GET_ORDER_SELECT_CUSTOMER,
	})) as GetOrderReturn | null;
	if (!order) {
		return new Response("Commande introuvable", { status: 404 });
	}

	const sessionOwns = order.userId === session.user.id;
	// EINV-SEC-003 : 404 indistinct (anti-énumération), cf. /invoice. Pas de token
	// guest sur cette route → l'accès owner-session implique un compte non anonymisé
	// (sessions supprimées à l'anonymisation), donc pas de garde EINV-SEC-002 ici.
	if (!isAdmin && !sessionOwns) {
		return new Response("Commande introuvable", { status: 404 });
	}

	const refund = await prisma.refund.findFirst({
		where: { id: refundId, orderId: order.id, deletedAt: null },
		select: {
			id: true,
			amount: true,
			reason: true,
			status: true,
			creditNoteNumber: true,
			creditNoteGeneratedAt: true,
			creditNotePdfUrl: true,
			creditNotePdfHash: true,
			items: {
				select: {
					orderItemId: true,
					quantity: true,
					amount: true,
					orderItem: {
						select: {
							productTitle: true,
							productDescription: true,
							skuSku: true,
							skuColor: true,
							skuMaterial: true,
							skuSize: true,
							quantity: true,
							price: true,
							taxRate: true,
							taxCategoryCode: true,
							hsCode: true,
							unitCode: true,
						},
					},
				},
			},
		},
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

	const auditSource: HistorySource = isAdmin ? HistorySource.ADMIN : HistorySource.CUSTOMER;
	const auditAuthorId = session.user.id;

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
				await recordCreditNoteDownload({
					orderId: order.id,
					refundId: refund.id,
					creditNoteNumber: refund.creditNoteNumber,
					authorId: auditAuthorId,
					source: auditSource,
				});
				return new Response(buffer, {
					headers: buildCreditNotePdfHeaders(refund.creditNoteNumber, orderNumber),
				});
			}
			logger.warn(
				`Archived credit note fetch failed (${archived.status}) — falling back to regeneration`,
				{ service: "credit-note-route", refundId: refund.id },
			);
		} catch (error) {
			logger.warn(`Archived credit note fetch threw — falling back to regeneration`, {
				service: "credit-note-route",
				refundId: refund.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// Régénération à la volée + archivage best-effort.
	const creditNoteData = buildCreditNoteData(order, {
		id: refund.id,
		amount: refund.amount,
		reason: refund.reason,
		creditNoteNumber: refund.creditNoteNumber,
		creditNoteGeneratedAt: refund.creditNoteGeneratedAt,
		items: refund.items,
	});
	const pdfBuffer = renderInvoicePdf(creditNoteData);

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
		authorId: auditAuthorId,
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
