import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { transmitEReportingBatch } from "@/modules/cron/services/transmit-ereporting-batch.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "transmit-ereporting-batch",
		defaultErrorMessage: "Failed to transmit e-reporting batches",
	},
	() => transmitEReportingBatch(),
);
