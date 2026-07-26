import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { reconcileInvoices } from "@/modules/cron/services/reconcile-invoices.service";

export const maxDuration = 60;

/**
 * DLQ facturation (Art. 286 / 289-I CGI). Rattrape les Orders PAID sans numéro de
 * facture, snapshots/PDF manquants et avoirs post-remboursement manquants
 * (Passes 0-3b), puis contrôle la continuité des séquences (Passe 4), archive les
 * PDF d'avoirs partiels (Passe 7) et vérifie l'intégrité des PDF archivés (Passe 8).
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
	() => reconcileInvoices(),
);
