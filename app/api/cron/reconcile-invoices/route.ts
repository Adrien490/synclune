import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { reconcileInvoices } from "@/modules/cron/services/reconcile-invoices.service";
import { reconcileVoidedInvoices } from "@/modules/cron/services/reconcile-voided-invoices.service";

export const maxDuration = 60;

/**
 * DLQ facturation (Art. 286 / 289-I CGI). Rattrape les Orders PAID sans numéro de
 * facture, snapshots/PDF manquants et avoirs post-remboursement manquants
 * (Passes 0-3b), puis contrôle la continuité des séquences (Passe 4), archive les
 * PDF d'avoirs partiels (Passe 7) et vérifie l'intégrité des PDF archivés (Passe 8).
 *
 * Seconde passe : `reconcileVoidedInvoices` (EINV-PDF-007) — commandes
 * CANCELLED/REFUNDED dont la facture est restée GENERATED sans avoir. La sélection
 * de `reconcileInvoices` (Passe 3) ne voit que les candidats `invoiceRetryDeferred`,
 * flag posé uniquement quand voidInvoice A ÉTÉ tenté et a échoué : une commande où
 * il n'a jamais été invoqué (webhook charge.refunded perdu) n'entrait dans aucune
 * file — le service existait mais n'avait AUCUN appelant (audit « Admin commandes »
 * 2026-08-01, P1-D). Même route et non cron dédié : chaque cron supplémentaire est
 * un réveil DB Neon (budget réveils, audit coûts P1-2). Ordre : la DLQ légale
 * d'abord (garantit ses 45 s de deadline interne), le filet voided ensuite —
 * nominalement 1 requête à 0 candidat, idempotent et repris la nuit suivante via
 * hasMore si le temps manque.
 *
 * Cron daily 02:00 (cf. vercel.json). Filet automatique en amont de l'alerte
 * hebdomadaire `alert-stuck-orders` (seuil 7 j) : sans ce cron, un échec du
 * chemin eager `ensureInvoiceNumberPersisted` (best-effort, renvoie 200 → pas de
 * retry Stripe) laissait l'ordre PAID-sans-facture jusqu'à intervention manuelle.
 */
export const GET = withCronGuard(
	{
		jobName: "reconcile-invoices",
		defaultErrorMessage: "Failed to reconcile invoices",
	},
	async () => {
		const invoices = await reconcileInvoices();
		const voided = await reconcileVoidedInvoices();

		return {
			...invoices,
			processed: invoices.processed + voided.processed,
			errored: invoices.errored + voided.errored,
			skipped: invoices.skipped + voided.skipped,
			hasMore: Boolean(invoices.hasMore) || Boolean(voided.hasMore),
			voidedReconciled: voided.processed,
			voidedErrored: voided.errored,
		};
	},
);
