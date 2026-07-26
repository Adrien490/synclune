import { ensureRefundCreditNoteArchived } from "@/modules/refunds/services/ensure-credit-note-archived.service";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { ensureOrderCreditNoteArchived } from "./ensure-credit-note-archived.service";

export interface EnsureUserCreditNotesArchivedResult {
	ok: boolean;
	/** Order IDs dont l'avoir full-void n'a pas pu être archivé. */
	orderFailures: string[];
	/** Refund IDs dont l'avoir partiel n'a pas pu être archivé. */
	refundFailures: string[];
}

/**
 * Garde pré-anonymisation RGPD (EINV-CREDIT-020) : matérialise + archive tout
 * avoir émis (Order full-void + Refund partiel) encore non archivé pour un
 * utilisateur AVANT le scrub de ses commandes.
 *
 * Sans cette garde, un avoir émis-jamais-téléchargé serait reconstruit après
 * anonymisation depuis les colonnes `customer*`/`shipping*` scrubées
 * (« Client supprimé ») — et ce document dégradé, sans identité client
 * (Art. 289 CGI), deviendrait la référence archivée immuable (Art. L102 B LPF).
 * La facture n'a pas ce problème : son `invoiceDataSnapshot` est figé à
 * l'émission et préservé à l'anonymisation (Art. 17(3)(b) RGPD).
 *
 * `ok=false` ⇒ l'appelant doit REPORTER l'anonymisation de ce compte (le cron
 * quotidien retentera ; l'archiveur a déjà flagué la DLQ + alerté l'admin).
 * Périmètre aligné sur les routes de téléchargement (order `notDeleted`,
 * refund `deletedAt: null`) : un avoir hors de ce périmètre n'est ni
 * téléchargeable ni matérialisable — il ne doit pas bloquer l'anonymisation.
 */
export async function ensureUserCreditNotesArchived(
	userId: string,
): Promise<EnsureUserCreditNotesArchivedResult> {
	const orderFailures: string[] = [];
	const refundFailures: string[] = [];

	const unarchivedOrders = await prisma.order.findMany({
		where: {
			userId,
			creditNoteNumber: { not: null },
			creditNotePdfUrl: null,
			piiPurgedAt: null,
			...notDeleted,
		},
		select: { id: true },
	});
	for (const order of unarchivedOrders) {
		const status = await ensureOrderCreditNoteArchived(order.id);
		if (status === "failed") {
			orderFailures.push(order.id);
		}
	}

	const unarchivedRefunds = await prisma.refund.findMany({
		where: {
			order: { userId, piiPurgedAt: null },
			creditNoteNumber: { not: null },
			creditNotePdfUrl: null,
			deletedAt: null,
		},
		select: { id: true },
	});
	for (const refund of unarchivedRefunds) {
		const status = await ensureRefundCreditNoteArchived(refund.id);
		if (status === "failed") {
			refundFailures.push(refund.id);
		}
	}

	const ok = orderFailures.length === 0 && refundFailures.length === 0;
	if (!ok) {
		logger.error(
			"ensureUserCreditNotesArchived — des avoirs émis n'ont pas pu être archivés, l'anonymisation doit être reportée",
			undefined,
			{
				service: "ensure-user-credit-notes-archived",
				userId,
				orderFailures,
				refundFailures,
			},
		);
	}

	return { ok, orderFailures, refundFailures };
}
