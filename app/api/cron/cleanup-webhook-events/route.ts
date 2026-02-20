import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupOldWebhookEvents } from "@/modules/cron/services/cleanup-webhook-events.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await cleanupOldWebhookEvents();
		return cronSuccess({
			job: "cleanup-webhook-events",
			...result,
		}, startTime);
	} catch (error) {
		sendAdminCronFailedAlert({
			job: "cleanup-webhook-events",
			errors: 1,
			details: {
				error: error instanceof Error ? error.message : String(error),
			},
		}).catch(() => {});

		return cronError(
			error instanceof Error
				? error.message
				: "Failed to cleanup webhook events"
		);
	}
}
