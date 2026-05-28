import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { buildEReportingBatch } from "@/modules/cron/services/build-ereporting-batch.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "build-ereporting-batch",
		defaultErrorMessage: "Failed to aggregate e-reporting transactions",
	},
	() => buildEReportingBatch(),
);
