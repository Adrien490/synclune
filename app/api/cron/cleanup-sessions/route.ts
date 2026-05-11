import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupExpiredSessions } from "@/modules/cron/services/cleanup-sessions.service";
export const maxDuration = 60;

export const GET = withCronGuard(
	{ jobName: "cleanup-sessions", defaultErrorMessage: "Failed to cleanup sessions" },
	() => cleanupExpiredSessions(),
);
