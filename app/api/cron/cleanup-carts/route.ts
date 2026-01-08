import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupExpiredCarts } from "@/modules/cron/services/cleanup-carts.service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await cleanupExpiredCarts();
		return cronSuccess({
			job: "cleanup-carts",
			deletedCount: result.deletedCount,
			orphanedItemsCount: result.orphanedItemsCount,
		});
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to cleanup carts"
		);
	}
}
