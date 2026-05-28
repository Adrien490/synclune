import { createHash } from "node:crypto";
import { HistorySource, OrderAction } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { utapi } from "@/shared/lib/uploadthing";
import { sendAdminPdfArchiveFailedAlert } from "@/modules/emails/services/admin-emails";
import { createOrderAudit, createOrderAuditTx } from "../utils/order-audit";

/**
 * Trace audit immuable + alerte admin pour échec archivage. Best-effort,
 * jamais bloquant. Le flag `invoiceRetryDeferred=true` permet au cron
 * `reconcile-invoices` de rejouer l'archivage. Cf. audit monitoring 2026-05-28
 * EINV-OPS-002 / EINV-OPS-004.
 */
async function flagPdfArchiveFailure(
	orderId: string,
	invoiceNumber: string,
	errorMessage: string,
): Promise<void> {
	try {
		const order = await prisma.order.update({
			where: { id: orderId },
			data: { invoiceRetryDeferred: true },
			select: { orderNumber: true },
		});

		await createOrderAudit({
			orderId,
			action: OrderAction.PDF_ARCHIVE_FAILED,
			source: HistorySource.SYSTEM,
			authorName: "Système (archive-invoice-pdf)",
			note: `Archivage PDF UploadThing échoué — flag invoiceRetryDeferred posé`,
			metadata: {
				invoiceNumber,
				errorMessage: errorMessage.slice(0, 500),
				deferredAt: new Date().toISOString(),
			},
		});

		await sendAdminPdfArchiveFailedAlert({
			orderId,
			orderNumber: order.orderNumber,
			invoiceNumber,
			errorMessage,
		});
	} catch (sideEffectError) {
		logger.error("flagPdfArchiveFailure threw — alert/audit partial", sideEffectError, {
			service: "archive-invoice-pdf",
			orderId,
			invoiceNumber,
		});
	}
}

interface ArchiveResult {
	invoicePdfUrl: string;
	invoicePdfHash: string;
}

/**
 * Upload + persist le PDF facture sur UploadThing (immuable bit-à-bit).
 *
 * Art. L102 B LPF : la facture doit pouvoir être restituée à l'identique sur
 * 10 ans. Stocker le buffer figé évite que les évolutions futures du template
 * (changement SIRET, mention TVA, etc.) modifient les factures historiques.
 *
 * Idempotent : si l'order a déjà un `invoicePdfUrl`, return sans rien faire.
 *
 * Cf. audit conformité 2026-05-27 — ORD-COMPLY-005
 */
export async function archiveInvoicePdf(
	orderId: string,
	invoiceNumber: string,
	pdfBuffer: ArrayBuffer | Uint8Array,
): Promise<ArchiveResult | null> {
	try {
		const existing = await prisma.order.findUnique({
			where: { id: orderId },
			select: { invoicePdfUrl: true, invoicePdfHash: true },
		});

		if (existing?.invoicePdfUrl && existing.invoicePdfHash) {
			return {
				invoicePdfUrl: existing.invoicePdfUrl,
				invoicePdfHash: existing.invoicePdfHash,
			};
		}

		const bytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
		const hash = createHash("sha256").update(bytes).digest("hex");
		const filename = `invoice-${invoiceNumber}.pdf`;
		// Wrap dans un Blob explicite pour satisfaire le typage BlobPart strict
		// (Uint8Array<ArrayBufferLike> ≠ BlobPart en TS 5.x).
		const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
		const file = new File([blob], filename, {
			type: "application/pdf",
		});

		const uploaded = await utapi.uploadFiles([file]);
		const data = uploaded[0]?.data;
		if (!data?.ufsUrl) {
			logger.error("archiveInvoicePdf — UploadThing returned no URL", undefined, {
				service: "archive-invoice-pdf",
				orderId,
				invoiceNumber,
			});
			await flagPdfArchiveFailure(orderId, invoiceNumber, "UploadThing returned no URL");
			return null;
		}

		// Audit-tracé : INVOICE_ARCHIVED dans la même tx que l'update Order.
		// (EINV-PDF-006 — Art. L123-22 : mutations critiques du dossier comptable
		// doivent apparaître dans OrderHistory, ici l'archivage du PDF).
		await prisma.$transaction(async (tx) => {
			await tx.order.update({
				where: { id: orderId },
				data: {
					invoicePdfUrl: data.ufsUrl,
					invoicePdfHash: hash,
					invoiceArchivedAt: new Date(),
					// Si le précédent run avait flagué un retry, on le relâche maintenant
					// que l'archive est bien posée.
					invoiceRetryDeferred: false,
				},
			});

			await createOrderAuditTx(tx, {
				orderId,
				action: OrderAction.INVOICE_ARCHIVED,
				source: HistorySource.SYSTEM,
				authorName: "Système (archive-invoice-pdf)",
				note: `Facture ${invoiceNumber} archivée sur UploadThing`,
				metadata: {
					invoiceNumber,
					invoicePdfHash: hash,
				},
			});
		});

		return { invoicePdfUrl: data.ufsUrl, invoicePdfHash: hash };
	} catch (error) {
		// Best-effort : un échec d'archivage ne doit PAS bloquer le download.
		// La facture sera ré-archivée au prochain appel + le cron `reconcile-invoices`
		// rejouera l'archive (flag `invoiceRetryDeferred=true`).
		logger.error("archiveInvoicePdf threw", error, {
			service: "archive-invoice-pdf",
			orderId,
			invoiceNumber,
		});
		await flagPdfArchiveFailure(
			orderId,
			invoiceNumber,
			error instanceof Error ? error.message : String(error),
		);
		return null;
	}
}
