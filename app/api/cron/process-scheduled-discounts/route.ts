import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { processScheduledDiscounts } from "@/modules/cron/services/process-scheduled-discounts.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await processScheduledDiscounts();
		return cronSuccess(
			{
				job: "process-scheduled-discounts",
				...result,
			},
			startTime,
		);
	} catch (error) {
		sendAdminCronFailedAlert({
			job: "process-scheduled-discounts",
			errors: 1,
			details: { error: error instanceof Error ? error.message : String(error) },
		}).catch((e) =>
			logger.error("Cron process-scheduled-discounts failed to send admin alert", e, {
				cronJob: "process-scheduled-discounts",
			}),
		);

		return cronError(
			error instanceof Error ? error.message : "Failed to process scheduled discounts",
		);
	}
}
