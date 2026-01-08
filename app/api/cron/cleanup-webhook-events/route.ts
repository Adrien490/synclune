import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupOldWebhookEvents } from "@/modules/cron/services/cleanup-webhook-events.service";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await cleanupOldWebhookEvents();
		return cronSuccess({
			job: "cleanup-webhook-events",
			completedDeleted: result.completedDeleted,
			failedDeleted: result.failedDeleted,
			skippedDeleted: result.skippedDeleted,
		});
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to cleanup webhook events"
		);
	}
}
