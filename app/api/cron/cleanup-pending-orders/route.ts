import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupPendingOrders } from "@/modules/cron/services/cleanup-pending-orders.service";
import { cleanupExpiredSessions } from "@/modules/cron/services/cleanup-sessions.service";

export const maxDuration = 60;

// Deux passes ops quotidiennes partagent cette route (right-sizing : pas de cron
// dédié — chaque cron supplémentaire réveille la base Neon, cf. audit coûts P1-2) :
// annulation des commandes PENDING abandonnées, puis purge des sessions Better
// Auth expirées (Lot 0 S3.7 — la table n'avait plus de borne depuis le retrait du
// cron cleanup-sessions). Aucune ne throw (try/catch par étape) — un échec de
// passe n'en masque donc pas une autre.
//
// La passe « purge des paniers guest expirés » est partie avec le panier en base
// (2026-08-04), comme celle des wishlists l'avait fait la veille (2026-08-03) :
// panier et favoris vivent maintenant dans des cookies, qui expirent tout seuls
// côté client — plus rien à purger côté serveur.
// La passe « drainage de la file retour en stock » a été retirée avec la
// notification de réassort (simplification V1 2026-07-30) : il n'y a plus aucun
// émetteur d'e-mail marketing, donc plus de file à drainer ni de budget à ménager.
export const GET = withCronGuard(
	{
		jobName: "cleanup-pending-orders",
		defaultErrorMessage: "Failed to cleanup pending orders",
	},
	async () => {
		const orders = await cleanupPendingOrders();
		const sessions = await cleanupExpiredSessions();

		return {
			processed: orders.processed + sessions.processed,
			errored: orders.errored + sessions.errored,
			skipped: orders.skipped + sessions.skipped,
			hasMore: Boolean(orders.hasMore) || Boolean(sessions.hasMore),
			cancelledOrders: orders.cancelled,
			deletedSessions: sessions.deletedSessions,
		};
	},
);
