import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { retryPostWebhookTasks } from "@/modules/cron/services/retry-post-webhook-tasks.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "retry-post-webhook-tasks",
		defaultErrorMessage: "Failed to retry post-webhook tasks",
	},
	() => retryPostWebhookTasks(),
);
