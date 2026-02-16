import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { sendDelayedReviewRequestEmails } from "@/modules/cron/services/review-request-emails.service";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await sendDelayedReviewRequestEmails();
		return cronSuccess({
			job: "review-request-emails",
			found: result.found,
			sent: result.sent,
			errors: result.errors,
			hasMore: result.hasMore,
		});
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to send review request emails"
		);
	}
}
