import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { retryFailedEmails } from "@/modules/cron/services/retry-failed-emails.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

export const maxDuration = 60;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await retryFailedEmails();

		if (result.exhausted > 0) {
			sendAdminCronFailedAlert({
				job: "retry-failed-emails",
				errors: result.exhausted,
				details: { found: result.found, retried: result.retried },
			}).catch(() => {});
		}

		return cronSuccess({
			job: "retry-failed-emails",
			...result,
		}, startTime);
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to retry failed emails"
		);
	}
}
