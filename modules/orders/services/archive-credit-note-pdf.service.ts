import { createHash } from "node:crypto";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { utapi } from "@/shared/lib/uploadthing";
import { sendAdminCreditNotePdfArchiveFailedAlert } from "@/modules/emails/services/admin-emails";

/**
 * Trace audit immuable + alerte admin pour échec archivage avoir. Best-effort,
 * jamais bloquant. Le flag `invoiceRetryDeferred=true` permet au cron
 * `reconcile-invoices` de rejouer l'archivage. Symétrie avec
 * `flagPdfArchiveFailure` (archive-invoice-pdf) — audit e-invoicing 2026-05-29 (F2).
 */
async function flagCreditNotePdfArchiveFailure(
	orderId: string,
	creditNoteNumber: string,
	errorMessage: string,
): Promise<void> {
	try {
		const order = await prisma.order.update({
			where: { id: orderId },
			data: { invoiceRetryDeferred: true },
			select: { orderNumber: true },
		});

		await sendAdminCreditNotePdfArchiveFailedAlert({
			orderId,
			orderNumber: order.orderNumber,
			creditNoteNumber,
			errorMessage,
		});
	} catch (sideEffectError) {
		logger.error("flagCreditNotePdfArchiveFailure threw — alert/audit partial", sideEffectError, {
			service: "archive-credit-note-pdf",
			orderId,
			creditNoteNumber,
		});
	}
}

interface ArchiveResult {
	creditNotePdfUrl: string;
	creditNotePdfHash: string;
}

/**
 * Upload + persist le PDF avoir sur UploadThing (immuable bit-à-bit).
 *
 * Symétrique à `archiveInvoicePdf` mais pour les colonnes `creditNotePdf*` de
 * l'Order. Art. L102 B LPF impose la même immuabilité 10 ans pour les avoirs
 * (Art. 272-I CGI) que pour les factures.
 *
 * Idempotent : si l'order a déjà un `creditNotePdfUrl`, return sans rien faire.
 * Best-effort : un échec d'archivage ne bloque pas le download (la route
 * `/credit-note` régénérera le PDF au prochain appel et retentera l'archivage),
 * mais il est désormais tracé (OrderHistory) + alerte admin + flag
 * `invoiceRetryDeferred` — symétrie avec la facture (audit 2026-05-29, F2).
 */
export async function archiveCreditNotePdf(
	orderId: string,
	creditNoteNumber: string,
	pdfBuffer: ArrayBuffer | Uint8Array,
): Promise<ArchiveResult | null> {
	try {
		const existing = await prisma.order.findUnique({
			where: { id: orderId },
			select: { creditNotePdfUrl: true, creditNotePdfHash: true },
		});

		if (existing?.creditNotePdfUrl && existing.creditNotePdfHash) {
			return {
				creditNotePdfUrl: existing.creditNotePdfUrl,
				creditNotePdfHash: existing.creditNotePdfHash,
			};
		}

		const bytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
		const hash = createHash("sha256").update(bytes).digest("hex");
		const filename = `credit-note-${creditNoteNumber}.pdf`;
		// Wrap dans un Blob explicite pour satisfaire le typage BlobPart strict
		// (Uint8Array<ArrayBufferLike> ≠ BlobPart en TS 5.x).
		const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
		const file = new File([blob], filename, {
			type: "application/pdf",
		});

		const uploaded = await utapi.uploadFiles([file]);
		const data = uploaded[0]?.data;
		if (!data?.ufsUrl) {
			logger.error("archiveCreditNotePdf — UploadThing returned no URL", undefined, {
				service: "archive-credit-note-pdf",
				orderId,
				creditNoteNumber,
			});
			await flagCreditNotePdfArchiveFailure(
				orderId,
				creditNoteNumber,
				"UploadThing returned no URL",
			);
			return null;
		}

		// IDEM-PDF-001 : claim conditionnel ré-évalué au lock de ligne — cf.
		// archive-invoice-pdf.service.ts (course eager/lazy/cron = double upload
		// + double audit sans ce claim). Le perdant supprime son upload orphelin.
		const claim = await prisma.$transaction(async (tx) => {
			const claimed = await tx.order.updateMany({
				// IDEM-PDF-002 : prédicat aligné sur l'early-return (`url && hash`) — sinon
				// une ligne `url` posée / `hash` NULL ne converge jamais (upload + delete à
				// chaque appel, retour `null`).
				where: { id: orderId, OR: [{ creditNotePdfUrl: null }, { creditNotePdfHash: null }] },
				data: {
					creditNotePdfUrl: data.ufsUrl,
					creditNotePdfHash: hash,
					// Relâche le flag retry si un run précédent l'avait posé.
					invoiceRetryDeferred: false,
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
			const current = await prisma.order.findUnique({
				where: { id: orderId },
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
		// Best-effort : un échec d'archivage ne doit PAS bloquer le download.
		logger.error("archiveCreditNotePdf threw", error, {
			service: "archive-credit-note-pdf",
			orderId,
			creditNoteNumber,
		});
		await flagCreditNotePdfArchiveFailure(
			orderId,
			creditNoteNumber,
			error instanceof Error ? error.message : String(error),
		);
		return null;
	}
}
