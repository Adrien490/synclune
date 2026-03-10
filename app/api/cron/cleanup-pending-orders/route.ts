import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { cleanupPendingOrders } from "@/modules/cron/services/cleanup-pending-orders.service";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 60;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await cleanupPendingOrders();
		if (!result) {
			return cronError("STRIPE_SECRET_KEY not configured");
		}

		return cronSuccess(
			{
				job: "cleanup-pending-orders",
				...result,
			},
			startTime,
		);
	} catch (error) {
		logger.error("Cron cleanup-pending-orders failed", error, {
			cronJob: "cleanup-pending-orders",
		});
		return cronError(error instanceof Error ? error.message : "Failed to cleanup pending orders");
	}
}
