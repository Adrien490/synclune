import { createHash } from "node:crypto";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { utapi } from "@/shared/lib/uploadthing";

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
			return null;
		}

		await prisma.order.update({
			where: { id: orderId },
			data: { invoicePdfUrl: data.ufsUrl, invoicePdfHash: hash },
		});

		return { invoicePdfUrl: data.ufsUrl, invoicePdfHash: hash };
	} catch (error) {
		// Best-effort : un échec d'archivage ne doit PAS bloquer le download.
		// La facture sera ré-archivée au prochain appel.
		logger.error("archiveInvoicePdf threw", error, {
			service: "archive-invoice-pdf",
			orderId,
			invoiceNumber,
		});
		return null;
	}
}
