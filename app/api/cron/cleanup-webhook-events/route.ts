import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { cleanupOldWebhookEvents } from "@/modules/cron/services/cleanup-webhook-events.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 60;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await cleanupOldWebhookEvents();
		return cronSuccess(
			{
				job: "cleanup-webhook-events",
				...result,
			},
			startTime,
		);
	} catch (error) {
		sendAdminCronFailedAlert({
			job: "cleanup-webhook-events",
			errors: 1,
			details: {
				error: error instanceof Error ? error.message : String(error),
			},
		}).catch((e) =>
			logger.error("Cron cleanup-webhook-events failed to send admin alert", e, {
				cronJob: "cleanup-webhook-events",
			}),
		);

		return cronError(error instanceof Error ? error.message : "Failed to cleanup webhook events");
	}
}
