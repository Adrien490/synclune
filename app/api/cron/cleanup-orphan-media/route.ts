import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupOrphanMedia } from "@/modules/cron/services/cleanup-orphan-media.service";
export const maxDuration = 60;

export const GET = withCronGuard(
	{ jobName: "cleanup-orphan-media", defaultErrorMessage: "Failed to cleanup orphan media" },
	() => cleanupOrphanMedia(),
);
