import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { sendDelayedReviewRequestEmails } from "@/modules/cron/services/review-request-emails.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await sendDelayedReviewRequestEmails();

		const totalErrors = result.errors + result.reminderErrors;
		if (totalErrors > 0) {
			sendAdminCronFailedAlert({
				job: "review-request-emails",
				errors: totalErrors,
				details: {
					found: result.found,
					sent: result.sent,
					remindersFound: result.remindersFound,
					remindersSent: result.remindersSent,
				},
			}).catch((e) => console.error("[CRON:review-request-emails] Failed to send admin alert", e));
		}

		return cronSuccess(
			{
				job: "review-request-emails",
				...result,
			},
			startTime,
		);
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to send review request emails",
		);
	}
}
