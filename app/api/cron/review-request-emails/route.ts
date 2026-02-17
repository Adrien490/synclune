import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { sendDelayedReviewRequestEmails } from "@/modules/cron/services/review-request-emails.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await sendDelayedReviewRequestEmails();

		if (result.errors > 0) {
			sendAdminCronFailedAlert({
				job: "review-request-emails",
				errors: result.errors,
				details: { found: result.found, sent: result.sent },
			}).catch(() => {});
		}

		return cronSuccess({
			job: "review-request-emails",
			...result,
		}, startTime);
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to send review request emails"
		);
	}
}
