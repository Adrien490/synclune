import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { processAbandonedOrders } from "@/modules/cron/services/abandoned-orders.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await processAbandonedOrders();
		return cronSuccess({
			job: "abandoned-orders",
			remindersSent: result.remindersSent,
			cancelled: result.cancelled,
			stockRestored: result.stockRestored,
			errors: result.errors,
		});
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to process abandoned orders"
		);
	}
}
