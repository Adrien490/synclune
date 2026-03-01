import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { sendCrossSellEmails } from "@/modules/cron/services/cross-sell-emails.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

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
			}).catch((e) => console.error("[CRON:cross-sell-emails] Failed to send admin alert", e));
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
