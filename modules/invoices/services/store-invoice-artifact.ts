import { createHash } from "node:crypto";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { utapi } from "@/shared/lib/uploadthing";

/**
 * Formats XML supportés pour archivage. Aligné sur le CHECK constraint DB
 * `Order_invoiceXmlFormat_check` (migration 20260528150000).
 */
export type XmlArtifactFormat =
	| "FACTURX_MINIMUM"
	| "FACTURX_BASIC"
	| "UBL_INVOICE"
	| "UBL_CREDITNOTE";

interface StoreArtifactResult {
	invoiceXmlUrl: string;
	invoiceXmlHash: string;
	invoiceXmlFormat: XmlArtifactFormat;
	/** `true` si la donnée existait déjà et qu'on a renvoyé l'existant. */
	reused: boolean;
}

/**
 * Upload + persist l'artifact XML (Factur-X / UBL / CII) sur UploadThing.
 *
 * Parallèle à `archive-invoice-pdf.service.ts` : même invariants (Art. L102 B
 * LPF — restitution à l'identique sur 10 ans), mais sur le XML transmis à la
 * PDP / archivé pour audit.
 *
 * **Idempotent** :
 *  - Si l'order a déjà un `invoiceXmlUrl` ET `invoiceXmlHash` qui matche le
 *    hash du XML proposé → return existant (reused=true), pas de re-upload.
 *  - Si hash différent : l'ancien artifact reste accessible via l'URL
 *    archivée, on log un warning (drift renderer = bug applicatif à traiter).
 *  - Si pas d'archive : upload + write DB.
 *
 * Best-effort : un échec d'upload ne casse pas la transmission (l'XML est
 * regénérable). Retourne null en cas d'erreur, l'appelant décide quoi faire.
 *
 * Cf. audit conformité 2026-05-28 — EINV-FORMAT-004.
 */
export async function storeInvoiceXmlArtifact(
	orderId: string,
	invoiceNumber: string,
	xml: string,
	format: XmlArtifactFormat,
): Promise<StoreArtifactResult | null> {
	try {
		const bytes = new TextEncoder().encode(xml);
		const hash = createHash("sha256").update(bytes).digest("hex");

		const existing = await prisma.order.findUnique({
			where: { id: orderId },
			select: {
				invoiceXmlUrl: true,
				invoiceXmlHash: true,
				invoiceXmlFormat: true,
			},
		});

		// Idempotence : même hash → renvoyer l'existant sans toucher UploadThing.
		if (existing?.invoiceXmlUrl && existing.invoiceXmlHash === hash) {
			return {
				invoiceXmlUrl: existing.invoiceXmlUrl,
				invoiceXmlHash: existing.invoiceXmlHash,
				invoiceXmlFormat: (existing.invoiceXmlFormat as XmlArtifactFormat | null) ?? format,
				reused: true,
			};
		}

		// Drift détecté : déjà archivé mais hash différent. L'audit attend
		// l'ancien artifact comme source de vérité — ne pas écraser.
		if (existing?.invoiceXmlUrl && existing.invoiceXmlHash && existing.invoiceXmlHash !== hash) {
			logger.warn(
				"storeInvoiceXmlArtifact — hash drift detected, keeping existing archive immutable",
				{
					service: "store-invoice-artifact",
					orderId,
					invoiceNumber,
					existingHash: existing.invoiceXmlHash,
					proposedHash: hash,
				},
			);
			return {
				invoiceXmlUrl: existing.invoiceXmlUrl,
				invoiceXmlHash: existing.invoiceXmlHash,
				invoiceXmlFormat: (existing.invoiceXmlFormat as XmlArtifactFormat | null) ?? format,
				reused: true,
			};
		}

		const extension = format.startsWith("UBL") ? "ubl.xml" : "facturx.xml";
		const filename = `invoice-${invoiceNumber}.${extension}`;
		const blob = new Blob([bytes as BlobPart], { type: "application/xml" });
		const file = new File([blob], filename, { type: "application/xml" });

		const uploaded = await utapi.uploadFiles([file]);
		const data = uploaded[0]?.data;
		if (!data?.ufsUrl) {
			logger.error("storeInvoiceXmlArtifact — UploadThing returned no URL", undefined, {
				service: "store-invoice-artifact",
				orderId,
				invoiceNumber,
			});
			return null;
		}

		await prisma.order.update({
			where: { id: orderId },
			data: {
				invoiceXmlUrl: data.ufsUrl,
				invoiceXmlHash: hash,
				invoiceXmlFormat: format,
				invoiceXmlArchivedAt: new Date(),
			},
		});

		return {
			invoiceXmlUrl: data.ufsUrl,
			invoiceXmlHash: hash,
			invoiceXmlFormat: format,
			reused: false,
		};
	} catch (error) {
		logger.error("storeInvoiceXmlArtifact threw", error, {
			service: "store-invoice-artifact",
			orderId,
			invoiceNumber,
		});
		return null;
	}
}
