import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { sendCrossSellEmails } from "@/modules/cron/services/cross-sell-emails.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 60;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await sendCrossSellEmails();

		if (result.errors > 0) {
			sendAdminCronFailedAlert({
				job: "cross-sell-emails",
				errors: result.errors,
				details: { found: result.found, sent: result.sent, skipped: result.skipped },
			}).catch((e) =>
				logger.error("Cron cross-sell-emails failed to send admin alert", e, {
					cronJob: "cross-sell-emails",
				}),
			);
		}

		return cronSuccess(
			{
				job: "cross-sell-emails",
				...result,
			},
			startTime,
		);
	} catch (error) {
		return cronError(error instanceof Error ? error.message : "Failed to send cross-sell emails");
	}
}
