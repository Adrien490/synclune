import { createHash } from "node:crypto";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { utapi } from "@/shared/lib/uploadthing";
import { sendAdminPdfArchiveFailedAlert } from "@/modules/emails/services/admin-emails";

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

		// IDEM-PDF-001 (audit idempotence 2026-07-02) : le check d'existence en
		// tête de fonction est HORS transaction — une course eager (webhook) vs
		// lazy (route download) vs Passe 2 cron uploadait deux fichiers puis
		// écrasait la colonne (last-write-wins) + doublait l'audit
		// l'archive. Le claim `updateMany({invoicePdfUrl: null})`
		// ré-évalue le prédicat au lock de ligne : un seul archiveur gagne,
		// le perdant supprime son upload orphelin et sert l'archive gagnante.
		const claim = await prisma.$transaction(async (tx) => {
			const claimed = await tx.order.updateMany({
				// IDEM-PDF-002 (audit idempotence 2026-07-26) : le prédicat doit couvrir les
				// MÊMES cas que l'early-return d'entrée (`url && hash`). Avec `url: null`
				// seul, une ligne mi-archivée (`url` posée, `hash` NULL — legacy ou crash
				// entre deux écritures) échouait l'early-return, uploadait, perdait le claim,
				// supprimait son upload et retournait `null` — à CHAQUE appel, sans jamais
				// réparer le hash. En couvrant `hash: null`, le run répare.
				where: { id: orderId, OR: [{ invoicePdfUrl: null }, { invoicePdfHash: null }] },
				data: {
					invoicePdfUrl: data.ufsUrl,
					invoicePdfHash: hash,
					// Si le précédent run avait flagué un retry, on le relâche maintenant
					// que l'archive est bien posée.
					invoiceRetryDeferred: false,
				},
			});
			if (claimed.count === 0) {
				return { won: false as const };
			}

			return { won: true as const };
		});

		if (!claim.won) {
			// Un archiveur concurrent a gagné : notre fichier est orphelin.
			// Suppression best-effort (cleanup-orphan-media rattrape sinon).
			if (data.key) {
				await utapi.deleteFiles([data.key]).catch(() => {});
			}
			const current = await prisma.order.findUnique({
				where: { id: orderId },
				select: { invoicePdfUrl: true, invoicePdfHash: true },
			});
			if (current?.invoicePdfUrl && current.invoicePdfHash) {
				return {
					invoicePdfUrl: current.invoicePdfUrl,
					invoicePdfHash: current.invoicePdfHash,
				};
			}
			return null;
		}

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
