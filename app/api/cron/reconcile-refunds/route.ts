import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { reconcileRefunds } from "@/modules/cron/services/reconcile-refunds.service";
export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "reconcile-refunds",
		defaultErrorMessage: "Failed to reconcile refunds",
	},
	() => reconcileRefunds(),
);
