import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { processAccountDeletions } from "@/modules/cron/services/process-account-deletions.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await processAccountDeletions();

		// Alert admin on errors (GDPR deletion failures require attention)
		if (result.errors > 0) {
			sendAdminCronFailedAlert({
				job: "process-account-deletions",
				errors: result.errors,
				details: { processed: result.processed, hasMore: result.hasMore },
			}).catch((e) =>
				logger.error("Cron process-account-deletions failed to send admin alert", e, {
					cronJob: "process-account-deletions",
				}),
			);
		}

		return cronSuccess(
			{
				job: "process-account-deletions",
				...result,
			},
			startTime,
		);
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to process account deletions",
		);
	}
}
