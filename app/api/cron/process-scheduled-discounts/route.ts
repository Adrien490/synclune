import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { processScheduledDiscounts } from "@/modules/cron/services/process-scheduled-discounts.service";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await processScheduledDiscounts();
		return cronSuccess({
			job: "process-scheduled-discounts",
			...result,
		}, startTime);
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to process scheduled discounts"
		);
	}
}
