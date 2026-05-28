import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { transmitInvoices } from "@/modules/cron/services/transmit-invoices.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "transmit-invoices",
		defaultErrorMessage: "Failed to transmit invoices to PDP",
	},
	() => transmitInvoices(),
);
