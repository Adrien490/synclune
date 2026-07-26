import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupPendingOrders } from "@/modules/cron/services/cleanup-pending-orders.service";
import { cleanupExpiredCarts } from "@/modules/cron/services/cleanup-carts.service";

export const maxDuration = 60;

// Deux passes ops quotidiennes partagent cette route (right-sizing : pas de cron
// dédié aux paniers) : annulation des commandes PENDING abandonnées, puis purge
// des paniers guest expirés. `cleanupExpiredCarts` ne throw jamais (try/catch
// par étape) — un échec de la passe paniers ne masque donc pas la passe orders.
export const GET = withCronGuard(
	{
		jobName: "cleanup-pending-orders",
		defaultErrorMessage: "Failed to cleanup pending orders",
	},
	async () => {
		const orders = await cleanupPendingOrders();
		const carts = await cleanupExpiredCarts();

		return {
			processed: orders.processed + carts.processed,
			errored: orders.errored + carts.errored,
			skipped: orders.skipped + carts.skipped,
			hasMore: Boolean(orders.hasMore) || Boolean(carts.hasMore),
			cancelledOrders: orders.cancelled,
			deletedCarts: carts.deletedCount,
			orphanedCartItems: carts.orphanedItemsCount,
		};
	},
);
