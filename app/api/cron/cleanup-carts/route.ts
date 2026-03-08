import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { cleanupExpiredCarts } from "@/modules/cron/services/cleanup-carts.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await cleanupExpiredCarts();
		return cronSuccess(
			{
				job: "cleanup-carts",
				...result,
			},
			startTime,
		);
	} catch (error) {
		sendAdminCronFailedAlert({
			job: "cleanup-carts",
			errors: 1,
			details: { error: error instanceof Error ? error.message : String(error) },
		}).catch((e) =>
			logger.error("Cron cleanup-carts failed to send admin alert", e, {
				cronJob: "cleanup-carts",
			}),
		);

		return cronError(error instanceof Error ? error.message : "Failed to cleanup carts");
	}
}
