import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { alertStuckOrders } from "@/modules/cron/services/alert-stuck-orders.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "alert-stuck-orders",
		defaultErrorMessage: "Failed to scan stuck orders",
	},
	() => alertStuckOrders(),
);
