import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { archiveCreditNotePdf } from "./archive-credit-note-pdf.service";
import { renderRefundCreditNotePdf } from "./render-refund-credit-note.service";

export type EnsureRefundCreditNoteArchivedStatus =
	"archived" | "already-archived" | "not-applicable" | "failed";

/**
 * Matérialise + archive eagerly le PDF de l'avoir partiel
 * (`Refund.creditNoteNumber`) s'il ne l'est pas encore.
 *
 * EINV-CREDIT-020 — symétrie avec `ensureOrderCreditNoteArchived` (orders) :
 * l'avoir Refund n'a pas de snapshot de données ; sans archivage eager, un avoir
 * émis-jamais-téléchargé serait matérialisé depuis des colonnes Order scrubées
 * après anonymisation RGPD (avoir sans identité client, Art. 289 CGI).
 *
 * Best-effort : ne throw jamais. L'échec d'upload est tracé + alerté par
 * `archiveCreditNotePdf` (refunds).
 */
export async function ensureRefundCreditNoteArchived(
	refundId: string,
): Promise<EnsureRefundCreditNoteArchivedStatus> {
	try {
		const refund = await prisma.refund.findUnique({
			where: { id: refundId },
			select: {
				creditNoteNumber: true,
				creditNotePdfUrl: true,
				order: { select: { piiPurgedAt: true } },
			},
		});

		if (!refund || !refund.creditNoteNumber || refund.order.piiPurgedAt) {
			return "not-applicable";
		}
		if (refund.creditNotePdfUrl) {
			return "already-archived";
		}

		const rendered = await renderRefundCreditNotePdf(refundId);
		if (!rendered) {
			logger.error(
				"ensureRefundCreditNoteArchived — credit note exists but render returned null (inconsistent state)",
				undefined,
				{ service: "ensure-credit-note-archived", refundId },
			);
			return "failed";
		}

		const archived = await archiveCreditNotePdf(
			refundId,
			rendered.creditNoteNumber,
			rendered.pdfBuffer,
		);
		return archived ? "archived" : "failed";
	} catch (error) {
		logger.error("ensureRefundCreditNoteArchived threw", error, {
			service: "ensure-credit-note-archived",
			refundId,
		});
		return "failed";
	}
}
