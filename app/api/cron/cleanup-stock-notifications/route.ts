import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupExpiredStockNotifications } from "@/modules/cron/services/cleanup-stock-notifications.service";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await cleanupExpiredStockNotifications();
		return cronSuccess({
			job: "cleanup-stock-notifications",
			expiredCount: result.expiredCount,
		});
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to cleanup stock notifications"
		);
	}
}
