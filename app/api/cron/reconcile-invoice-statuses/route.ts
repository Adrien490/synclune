import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { reconcileInvoiceStatuses } from "@/modules/cron/services/reconcile-invoice-statuses.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "reconcile-invoice-statuses",
		defaultErrorMessage: "Failed to reconcile invoice statuses",
	},
	() => reconcileInvoiceStatuses(),
);
