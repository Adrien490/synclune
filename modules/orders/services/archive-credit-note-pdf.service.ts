import { createHash } from "node:crypto";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { utapi } from "@/shared/lib/uploadthing";

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
 * `/credit-note` régénérera le PDF au prochain appel et retentera l'archivage).
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
			return null;
		}

		await prisma.order.update({
			where: { id: orderId },
			data: { creditNotePdfUrl: data.ufsUrl, creditNotePdfHash: hash },
		});

		return { creditNotePdfUrl: data.ufsUrl, creditNotePdfHash: hash };
	} catch (error) {
		logger.error("archiveCreditNotePdf threw", error, {
			service: "archive-credit-note-pdf",
			orderId,
			creditNoteNumber,
		});
		return null;
	}
}
