import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { refreshStaleDirectoryEntries } from "@/modules/cron/services/refresh-stale-directory-entries.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "refresh-stale-directory-entries",
		defaultErrorMessage: "Failed to refresh directory cache",
	},
	() => refreshStaleDirectoryEntries(),
);
