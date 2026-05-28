import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { reconcileVoidedInvoices } from "@/modules/cron/services/reconcile-voided-invoices.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "reconcile-voided-invoices",
		defaultErrorMessage: "Failed to reconcile voided invoices",
	},
	() => reconcileVoidedInvoices(),
);
