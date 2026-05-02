import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { syncAsyncPayments } from "@/modules/cron/services/sync-async-payments.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{ jobName: "sync-async-payments", defaultErrorMessage: "Failed to sync async payments" },
	() => syncAsyncPayments(),
);
