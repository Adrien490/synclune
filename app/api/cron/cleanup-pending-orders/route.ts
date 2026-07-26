import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupPendingOrders } from "@/modules/cron/services/cleanup-pending-orders.service";
import { cleanupExpiredCarts } from "@/modules/cron/services/cleanup-carts.service";
import { drainBackInStockQueue } from "@/modules/cron/services/drain-back-in-stock.service";

export const maxDuration = 60;

// Trois passes ops quotidiennes partagent cette route (right-sizing : pas de cron
// dédié — chaque cron supplémentaire réveille la base Neon, cf. audit coûts P1-2) :
// annulation des commandes PENDING abandonnées, purge des paniers guest expirés,
// puis drainage de la file « retour en stock ». Aucune des trois ne throw
// (try/catch par étape) — un échec de passe n'en masque donc pas une autre.
//
// La passe de drainage est volontairement DERNIÈRE : elle envoie des emails
// marketing, le poste le moins critique de la route. Elle ne s'exécute que si le
// budget marketing du jour n'est pas déjà consommé (cf. `email-budget.ts`).
export const GET = withCronGuard(
	{
		jobName: "cleanup-pending-orders",
		defaultErrorMessage: "Failed to cleanup pending orders",
	},
	async () => {
		const orders = await cleanupPendingOrders();
		const carts = await cleanupExpiredCarts();
		const backInStock = await drainBackInStockQueue();

		return {
			processed: orders.processed + carts.processed + backInStock.processed,
			errored: orders.errored + carts.errored + backInStock.errored,
			skipped: orders.skipped + carts.skipped + backInStock.skipped,
			hasMore: Boolean(orders.hasMore) || Boolean(carts.hasMore) || Boolean(backInStock.hasMore),
			cancelledOrders: orders.cancelled,
			deletedCarts: carts.deletedCount,
			orphanedCartItems: carts.orphanedItemsCount,
			backInStockNotified: backInStock.processed,
		};
	},
);
