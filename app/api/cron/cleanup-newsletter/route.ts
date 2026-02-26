import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupUnconfirmedNewsletterSubscriptions } from "@/modules/cron/services/cleanup-newsletter.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

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
		sendAdminCronFailedAlert({
			job: "cleanup-newsletter",
			errors: 1,
			details: { error: error instanceof Error ? error.message : String(error) },
		}).catch((e) => console.error("[CRON:cleanup-newsletter] Failed to send admin alert", e));

		return cronError(
			error instanceof Error
				? error.message
				: "Failed to cleanup newsletter subscriptions"
		);
	}
}
