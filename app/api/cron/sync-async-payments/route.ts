import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { syncAsyncPayments } from "@/modules/cron/services/sync-async-payments.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await syncAsyncPayments();
		if (!result) {
			return cronError("STRIPE_SECRET_KEY not configured");
		}

		// Alert admin on errors (payment sync failures can cause stuck orders)
		if (result.errors > 0) {
			sendAdminCronFailedAlert({
				job: "sync-async-payments",
				errors: result.errors,
				details: { checked: result.checked, updated: result.updated },
			}).catch((e) => console.error("[CRON:sync-async-payments] Failed to send admin alert", e));
		}

		return cronSuccess(
			{
				job: "sync-async-payments",
				...result,
			},
			startTime,
		);
	} catch (error) {
		return cronError(error instanceof Error ? error.message : "Failed to sync async payments");
	}
}
