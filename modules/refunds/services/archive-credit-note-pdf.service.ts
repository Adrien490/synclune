import { createHash } from "node:crypto";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { utapi } from "@/shared/lib/uploadthing";
import { sendAdminCreditNotePdfArchiveFailedAlert } from "@/modules/emails/services/admin-emails";

/**
 * Trace audit + alerte admin pour échec archivage avoir partiel. Best-effort,
 * jamais bloquant. Symétrie avec le côté Order (`flagCreditNotePdfArchiveFailure`
 * de `orders/archive-credit-note-pdf.service.ts`) : sans alerte, un échec
 * d'archivage Refund restait silencieux (audit-only) alors que le cron
 * `reconcile-invoices` (passe avoirs Refund) le rattrape désormais.
 * Cf. audit avoirs 2026-05-28 — EINV-CREDIT-002 + audit facturation 2026-07-09.
 */
async function flagCreditNotePdfArchiveFailure(
	refundId: string,
	orderId: string,
	creditNoteNumber: string,
	errorMessage: string,
): Promise<void> {
	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { orderNumber: true },
		});
		await sendAdminCreditNotePdfArchiveFailedAlert({
			orderId,
			orderNumber: order?.orderNumber ?? orderId,
			creditNoteNumber,
			errorMessage,
		});
	} catch (sideEffectError) {
		logger.error("flagCreditNotePdfArchiveFailure threw — audit/alert partial", sideEffectError, {
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

		// IDEM-PDF-001 : claim conditionnel ré-évalué au lock de ligne — cf.
		// archive-invoice-pdf.service.ts (course concurrente = double upload +
		// double audit sans ce claim). Le perdant supprime son upload orphelin.
		const claim = await prisma.$transaction(async (tx) => {
			const claimed = await tx.refund.updateMany({
				// IDEM-PDF-002 : prédicat aligné sur l'early-return (`url && hash`) — sinon
				// une ligne `url` posée / `hash` NULL ne converge jamais.
				where: { id: refundId, OR: [{ creditNotePdfUrl: null }, { creditNotePdfHash: null }] },
				data: {
					creditNotePdfUrl: data.ufsUrl,
					creditNotePdfHash: hash,
				},
			});
			if (claimed.count === 0) {
				return { won: false as const };
			}

			return { won: true as const };
		});

		if (!claim.won) {
			if (data.key) {
				await utapi.deleteFiles([data.key]).catch(() => {});
			}
			const current = await prisma.refund.findUnique({
				where: { id: refundId },
				select: { creditNotePdfUrl: true, creditNotePdfHash: true },
			});
			if (current?.creditNotePdfUrl && current.creditNotePdfHash) {
				return {
					creditNotePdfUrl: current.creditNotePdfUrl,
					creditNotePdfHash: current.creditNotePdfHash,
				};
			}
			return null;
		}

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
