import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupPendingOrders } from "@/modules/cron/services/cleanup-pending-orders.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "cleanup-pending-orders",
		defaultErrorMessage: "Failed to cleanup pending orders",
	},
	() => cleanupPendingOrders(),
);
