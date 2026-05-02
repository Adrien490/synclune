import { withCronGuard } from "@/modules/cron/lib/with-cron-guard";
import { cleanupExpiredWishlists } from "@/modules/cron/services/cleanup-wishlists.service";

export const maxDuration = 30;

export const GET = withCronGuard(
	{ jobName: "cleanup-wishlists", defaultErrorMessage: "Failed to cleanup wishlists" },
	() => cleanupExpiredWishlists(),
);
