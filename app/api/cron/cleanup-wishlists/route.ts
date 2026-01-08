import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupExpiredWishlists } from "@/modules/cron/services/cleanup-wishlists.service";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await cleanupExpiredWishlists();
		return cronSuccess({
			job: "cleanup-wishlists",
			deletedCount: result.deletedCount,
			orphanedItemsCount: result.orphanedItemsCount,
		});
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to cleanup wishlists"
		);
	}
}
