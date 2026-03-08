import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { retryFailedEmails } from "@/modules/cron/services/retry-failed-emails.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 60;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await retryFailedEmails();

		if (result.errors > 0) {
			sendAdminCronFailedAlert({
				job: "retry-failed-emails",
				errors: result.errors,
				details: {
					found: result.found,
					retried: result.retried,
					resolved: result.resolved,
				},
			}).catch((e) =>
				logger.error("Cron retry-failed-emails failed to send admin alert", e, {
					cronJob: "retry-failed-emails",
				}),
			);
		}

		return cronSuccess(
			{
				job: "retry-failed-emails",
				...result,
			},
			startTime,
		);
	} catch (error) {
		return cronError(error instanceof Error ? error.message : "Failed to retry failed emails");
	}
}
