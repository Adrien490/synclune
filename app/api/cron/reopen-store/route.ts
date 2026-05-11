import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { autoReopenIfDue } from "@/modules/store-settings/services/auto-reopen.service";
export const maxDuration = 60;

export const GET = withCronGuard(
	{ jobName: "reopen-store", defaultErrorMessage: "Failed to auto-reopen store" },
	() => autoReopenIfDue(),
);
