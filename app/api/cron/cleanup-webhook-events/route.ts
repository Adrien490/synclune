import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupOldWebhookEvents } from "@/modules/cron/services/cleanup-webhook-events.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{ jobName: "cleanup-webhook-events", defaultErrorMessage: "Failed to cleanup webhook events" },
	() => cleanupOldWebhookEvents(),
);
