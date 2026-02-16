import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupUnconfirmedNewsletterSubscriptions } from "@/modules/cron/services/cleanup-newsletter.service";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await cleanupUnconfirmedNewsletterSubscriptions();
		return cronSuccess({
			job: "cleanup-newsletter",
			...result,
		}, startTime);
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to cleanup newsletter subscriptions"
		);
	}
}
