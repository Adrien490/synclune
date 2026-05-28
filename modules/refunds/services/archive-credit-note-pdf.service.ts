import { createHash } from "node:crypto";
import { HistorySource, OrderAction } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { utapi } from "@/shared/lib/uploadthing";
import { createOrderAudit, createOrderAuditTx } from "@/modules/orders/utils/order-audit";

/**
 * Trace audit pour échec archivage avoir. Best-effort, jamais bloquant.
 * Cf. audit avoirs 2026-05-28 — EINV-CREDIT-002.
 */
async function flagCreditNotePdfArchiveFailure(
	refundId: string,
	orderId: string,
	creditNoteNumber: string,
	errorMessage: string,
): Promise<void> {
	try {
		await createOrderAudit({
			orderId,
			action: OrderAction.PDF_ARCHIVE_FAILED,
			source: HistorySource.SYSTEM,
			authorName: "Système (archive-credit-note-pdf)",
			note: `Archivage PDF avoir UploadThing échoué — rattrapage cron requis`,
			metadata: {
				refundId,
				creditNoteNumber,
				errorMessage: errorMessage.slice(0, 500),
				deferredAt: new Date().toISOString(),
			},
		});
	} catch (sideEffectError) {
		logger.error("flagCreditNotePdfArchiveFailure threw — audit partial", sideEffectError, {
			service: "archive-credit-note-pdf",
			refundId,
			creditNoteNumber,
		});
	}
}

interface ArchiveCreditNoteResult {
	creditNotePdfUrl: string;
	creditNotePdfHash: string;
}

/**
 * Upload + persist le PDF avoir sur UploadThing (immuable bit-à-bit).
 *
 * Symétrique à `archiveInvoicePdf` mais écrit sur `Refund.creditNotePdfUrl` /
 * `Refund.creditNotePdfHash` (et non Order, qui peut porter plusieurs avoirs
 * partiels via plusieurs Refunds).
 *
 * Art. L102 B LPF — conservation immuable 10 ans : l'avoir doit pouvoir être
 * restitué à l'identique. Le hash SHA-256 protège contre modification.
 *
 * Idempotent : si `creditNotePdfUrl` + `creditNotePdfHash` déjà présents,
 * return sans rien faire.
 *
 * Cf. audit avoirs 2026-05-28 — EINV-CREDIT-002.
 */
export async function archiveCreditNotePdf(
	refundId: string,
	creditNoteNumber: string,
	pdfBuffer: ArrayBuffer | Uint8Array,
): Promise<ArchiveCreditNoteResult | null> {
	const refund = await prisma.refund.findUnique({
		where: { id: refundId },
		select: {
			id: true,
			orderId: true,
			creditNotePdfUrl: true,
			creditNotePdfHash: true,
		},
	});

	if (!refund) {
		logger.warn(`archiveCreditNotePdf — refund not found: ${refundId}`, {
			service: "archive-credit-note-pdf",
		});
		return null;
	}

	if (refund.creditNotePdfUrl && refund.creditNotePdfHash) {
		return {
			creditNotePdfUrl: refund.creditNotePdfUrl,
			creditNotePdfHash: refund.creditNotePdfHash,
		};
	}

	try {
		const bytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
		const hash = createHash("sha256").update(bytes).digest("hex");
		const filename = `credit-note-${creditNoteNumber}.pdf`;
		const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
		const file = new File([blob], filename, { type: "application/pdf" });

		const uploaded = await utapi.uploadFiles([file]);
		const data = uploaded[0]?.data;
		if (!data?.ufsUrl) {
			logger.error("archiveCreditNotePdf — UploadThing returned no URL", undefined, {
				service: "archive-credit-note-pdf",
				refundId,
				creditNoteNumber,
			});
			await flagCreditNotePdfArchiveFailure(
				refundId,
				refund.orderId,
				creditNoteNumber,
				"UploadThing returned no URL",
			);
			return null;
		}

		await prisma.$transaction(async (tx) => {
			await tx.refund.update({
				where: { id: refundId },
				data: {
					creditNotePdfUrl: data.ufsUrl,
					creditNotePdfHash: hash,
				},
			});

			await createOrderAuditTx(tx, {
				orderId: refund.orderId,
				action: OrderAction.INVOICE_ARCHIVED,
				source: HistorySource.SYSTEM,
				authorName: "Système (archive-credit-note-pdf)",
				note: `Avoir ${creditNoteNumber} archivé sur UploadThing`,
				metadata: {
					refundId,
					creditNoteNumber,
					creditNotePdfHash: hash,
				},
			});
		});

		return { creditNotePdfUrl: data.ufsUrl, creditNotePdfHash: hash };
	} catch (error) {
		logger.error("archiveCreditNotePdf threw", error, {
			service: "archive-credit-note-pdf",
			refundId,
			creditNoteNumber,
		});
		await flagCreditNotePdfArchiveFailure(
			refundId,
			refund.orderId,
			creditNoteNumber,
			error instanceof Error ? error.message : String(error),
		);
		return null;
	}
}
