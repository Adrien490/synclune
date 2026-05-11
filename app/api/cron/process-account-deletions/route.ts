import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { processAccountDeletions } from "@/modules/cron/services/process-account-deletions.service";
export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "process-account-deletions",
		defaultErrorMessage: "Failed to process account deletions",
	},
	() => processAccountDeletions(),
);
