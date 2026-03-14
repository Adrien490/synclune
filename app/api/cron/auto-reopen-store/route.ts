import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { autoReopenStore } from "@/modules/cron/services/auto-reopen-store.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await autoReopenStore();
		return cronSuccess(
			{
				job: "auto-reopen-store",
				...result,
			},
			startTime,
		);
	} catch (error) {
		sendAdminCronFailedAlert({
			job: "auto-reopen-store",
			errors: 1,
			details: { error: error instanceof Error ? error.message : String(error) },
		}).catch((e) =>
			logger.error("Cron auto-reopen-store failed to send admin alert", e, {
				cronJob: "auto-reopen-store",
			}),
		);

		return cronError(error instanceof Error ? error.message : "Failed to auto-reopen store");
	}
}
