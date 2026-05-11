import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupExpiredCarts } from "@/modules/cron/services/cleanup-carts.service";
export const maxDuration = 60;

export const GET = withCronGuard(
	{ jobName: "cleanup-carts", defaultErrorMessage: "Failed to cleanup carts" },
	() => cleanupExpiredCarts(),
);
