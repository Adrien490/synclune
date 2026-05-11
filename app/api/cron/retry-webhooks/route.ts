import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { retryFailedWebhooks } from "@/modules/cron/services/retry-webhooks.service";
export const maxDuration = 60;

export const GET = withCronGuard(
	{ jobName: "retry-webhooks", defaultErrorMessage: "Failed to retry webhooks" },
	() => retryFailedWebhooks(),
);
