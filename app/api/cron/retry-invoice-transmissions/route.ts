import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { retryInvoiceTransmissions } from "@/modules/cron/services/retry-invoice-transmissions.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "retry-invoice-transmissions",
		defaultErrorMessage: "Failed to retry invoice transmissions",
	},
	() => retryInvoiceTransmissions(),
);
