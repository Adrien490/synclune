import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { reconcileInvoices } from "@/modules/cron/services/reconcile-invoices.service";
export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "reconcile-invoices",
		defaultErrorMessage: "Failed to reconcile invoices",
	},
	() => reconcileInvoices(),
);
