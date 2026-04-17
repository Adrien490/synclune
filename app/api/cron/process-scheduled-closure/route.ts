import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { processScheduledClosure } from "@/modules/cron/services/process-scheduled-closure.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await processScheduledClosure();
		return cronSuccess(
			{
				job: "process-scheduled-closure",
				...result,
			},
			startTime,
		);
	} catch (error) {
		sendAdminCronFailedAlert({
			job: "process-scheduled-closure",
			errors: 1,
			details: { error: error instanceof Error ? error.message : String(error) },
		}).catch((e) =>
			logger.error("Cron process-scheduled-closure failed to send admin alert", e, {
				cronJob: "process-scheduled-closure",
			}),
		);

		return cronError(
			error instanceof Error ? error.message : "Failed to process scheduled closure",
		);
	}
}
