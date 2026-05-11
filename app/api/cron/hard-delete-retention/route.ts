import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { hardDeleteExpiredRecords } from "@/modules/cron/services/hard-delete-retention.service";
export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "hard-delete-retention",
		defaultErrorMessage: "Failed to hard delete expired records",
	},
	() => hardDeleteExpiredRecords(),
);
