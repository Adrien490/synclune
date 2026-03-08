import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { sendAbandonedCartEmails } from "@/modules/cron/services/abandoned-cart-emails.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 60;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await sendAbandonedCartEmails();

		if (result.errors > 0) {
			sendAdminCronFailedAlert({
				job: "abandoned-cart-emails",
				errors: result.errors,
				details: { found: result.found, sent: result.sent },
			}).catch((e) =>
				logger.error("Cron abandoned-cart-emails failed to send admin alert", e, {
					cronJob: "abandoned-cart-emails",
				}),
			);
		}

		return cronSuccess(
			{
				job: "abandoned-cart-emails",
				...result,
			},
			startTime,
		);
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to send abandoned cart emails",
		);
	}
}
