import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { alertDisputeDeadlines } from "@/modules/cron/services/alert-dispute-deadlines.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "alert-dispute-deadlines",
		defaultErrorMessage: "Failed to scan dispute deadlines",
	},
	() => alertDisputeDeadlines(),
);
