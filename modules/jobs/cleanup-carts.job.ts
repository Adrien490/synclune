import { schedules } from "@trigger.dev/sdk";

/**
 * Trigger.dev scheduled job: cleanup expired guest carts
 *
 * Replaces the Vercel cron job at /api/cron/cleanup-carts
 * Benefits: durable execution, automatic retries, monitoring dashboard
 */
export const cleanupCartsJob = schedules.task({
	id: "cleanup-carts",
	cron: "0 2 * * *", // Daily at 2:00 UTC
	run: async () => {
		// Dynamic import to keep the existing service logic
		const { cleanupExpiredCarts } = await import("@/modules/cron/services/cleanup-carts.service");

		const result = await cleanupExpiredCarts();

		return {
			deletedCount: result.deletedCount,
			orphanedItemsCount: result.orphanedItemsCount,
			hasMore: result.hasMore,
		};
	},
});
