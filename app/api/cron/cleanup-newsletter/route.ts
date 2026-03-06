import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import {
	cleanupUnconfirmedNewsletterSubscriptions,
	unsubscribeInactiveNewsletterSubscribers,
} from "@/modules/cron/services/cleanup-newsletter.service";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const unconfirmedResult = await cleanupUnconfirmedNewsletterSubscriptions();
		const inactiveResult = await unsubscribeInactiveNewsletterSubscribers();

		return cronSuccess(
			{
				job: "cleanup-newsletter",
				unconfirmedDeleted: unconfirmedResult.deleted,
				inactiveUnsubscribed: inactiveResult.unsubscribed,
				hasMore: unconfirmedResult.hasMore || inactiveResult.hasMore,
			},
			startTime,
		);
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to cleanup newsletter subscriptions",
		);
	}
}
