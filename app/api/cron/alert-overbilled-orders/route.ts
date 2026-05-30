import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { alertOverbilledOrders } from "@/modules/cron/services/alert-overbilled-orders.service";

export const maxDuration = 60;

export const GET = withCronGuard(
	{
		jobName: "alert-overbilled-orders",
		defaultErrorMessage: "Failed to scan overbilled orders",
	},
	() => alertOverbilledOrders(),
);
