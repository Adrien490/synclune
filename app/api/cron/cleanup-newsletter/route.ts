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
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const [unconfirmed, inactive] = await Promise.all([
			cleanupUnconfirmedNewsletterSubscriptions(),
			unsubscribeInactiveNewsletterSubscribers(),
		]);

		return cronSuccess(
			{
				job: "cleanup-newsletter",
				unconfirmedDeleted: unconfirmed.deleted,
				inactiveUnsubscribed: inactive.unsubscribed,
				hasMore: unconfirmed.hasMore || inactive.hasMore,
			},
			startTime,
		);
	} catch (error) {
		sendAdminCronFailedAlert({
			job: "cleanup-newsletter",
			errors: 1,
			details: { error: error instanceof Error ? error.message : String(error) },
		}).catch((e) => console.error("[CRON:cleanup-newsletter] Failed to send admin alert", e));

		return cronError(
			error instanceof Error ? error.message : "Failed to cleanup newsletter subscriptions",
		);
	}
}
