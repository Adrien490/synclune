import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupPendingOrders } from "@/modules/cron/services/cleanup-pending-orders.service";
import { cleanupExpiredCarts } from "@/modules/cron/services/cleanup-carts.service";
import { cleanupInactiveWishlists } from "@/modules/cron/services/cleanup-wishlists.service";
import { cleanupExpiredSessions } from "@/modules/cron/services/cleanup-sessions.service";

export const maxDuration = 60;

// Quatre passes ops quotidiennes partagent cette route (right-sizing : pas de cron
// dédié — chaque cron supplémentaire réveille la base Neon, cf. audit coûts P1-2) :
// annulation des commandes PENDING abandonnées, purge des paniers guest expirés,
// purge des wishlists guest inactives (garde RGPD art. 5.1.e — audit wishlist
// 2026-08-01), puis purge des sessions Better Auth expirées (Lot 0 S3.7 — la table
// n'avait plus de borne depuis le retrait du cron cleanup-sessions). Aucune ne
// throw (try/catch par étape) — un échec de passe n'en masque donc pas une autre.
//
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
		const carts = await cleanupExpiredCarts();
		const wishlists = await cleanupInactiveWishlists();
		const sessions = await cleanupExpiredSessions();

		return {
			processed: orders.processed + carts.processed + wishlists.processed + sessions.processed,
			errored: orders.errored + carts.errored + wishlists.errored + sessions.errored,
			skipped: orders.skipped + carts.skipped + wishlists.skipped + sessions.skipped,
			hasMore:
				Boolean(orders.hasMore) ||
				Boolean(carts.hasMore) ||
				Boolean(wishlists.hasMore) ||
				Boolean(sessions.hasMore),
			cancelledOrders: orders.cancelled,
			deletedCarts: carts.deletedCount,
			orphanedCartItems: carts.orphanedItemsCount,
			deletedWishlists: wishlists.deletedCount,
			orphanedWishlistItems: wishlists.orphanedItemsCount,
			deletedSessions: sessions.deletedSessions,
		};
	},
);
