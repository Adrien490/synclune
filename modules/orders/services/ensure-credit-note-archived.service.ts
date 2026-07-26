import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { archiveCreditNotePdf } from "./archive-credit-note-pdf.service";
import { renderOrderCreditNotePdf } from "./render-order-credit-note.service";

export type EnsureCreditNoteArchivedStatus =
	"archived" | "already-archived" | "not-applicable" | "failed";

/**
 * Matérialise + archive eagerly le PDF de l'avoir d'annulation (full void,
 * `Order.creditNoteNumber`) s'il ne l'est pas encore.
 *
 * EINV-CREDIT-020 : contrairement à la facture (snapshot JSON figé + archivage
 * eager au webhook), l'avoir n'a pas de snapshot de données — son contenu est
 * reconstruit depuis les colonnes Order à chaque rendu. Un avoir émis mais
 * jamais archivé serait matérialisé DÉGRADÉ après anonymisation RGPD du compte
 * (buyer/shipping scrubés → avoir sans identité client, Art. 289 CGI), et ce
 * document dégradé deviendrait la référence immuable. L'archivage doit donc
 * être EAGER à l'émission (`voidInvoice`), rattrapé par le cron
 * `reconcile-invoices` et verrouillé par la garde pré-anonymisation
 * (`ensureUserCreditNotesArchived`).
 *
 * Best-effort : ne throw jamais. L'échec d'upload est déjà tracé + alerté par
 * `archiveCreditNotePdf` (flag `invoiceRetryDeferred` → DLQ reconcile-invoices).
 */
export async function ensureOrderCreditNoteArchived(
	orderId: string,
): Promise<EnsureCreditNoteArchivedStatus> {
	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { creditNoteNumber: true, creditNotePdfUrl: true, piiPurgedAt: true },
		});

		// Purge 10 ans : l'avoir n'est plus reconstituable (base légale expirée) — on
		// n'y touche plus (symétrie avec la garde piiPurgedAt de reconcile-invoices).
		if (!order || !order.creditNoteNumber || order.piiPurgedAt) {
			return "not-applicable";
		}
		if (order.creditNotePdfUrl) {
			return "already-archived";
		}

		const rendered = await renderOrderCreditNotePdf(orderId);
		if (!rendered) {
			logger.error(
				"ensureOrderCreditNoteArchived — credit note exists but render returned null (inconsistent state)",
				undefined,
				{ service: "ensure-credit-note-archived", orderId },
			);
			return "failed";
		}

		const archived = await archiveCreditNotePdf(
			orderId,
			rendered.creditNoteNumber,
			rendered.pdfBuffer,
		);
		return archived ? "archived" : "failed";
	} catch (error) {
		logger.error("ensureOrderCreditNoteArchived threw", error, {
			service: "ensure-credit-note-archived",
			orderId,
		});
		return "failed";
	}
}
