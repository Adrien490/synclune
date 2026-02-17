import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { retryFailedWebhooks } from "@/modules/cron/services/retry-webhooks.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await retryFailedWebhooks();
		if (!result) {
			return cronError("STRIPE_SECRET_KEY not configured");
		}

		if (result.errors > 0 || result.permanentlyFailed > 0) {
			sendAdminCronFailedAlert({
				job: "retry-webhooks",
				errors: result.errors + result.permanentlyFailed,
				details: {
					found: result.found,
					retried: result.retried,
					succeeded: result.succeeded,
					permanentlyFailed: result.permanentlyFailed,
					orphansRecovered: result.orphansRecovered,
				},
			}).catch(() => {});
		}

		return cronSuccess({
			job: "retry-webhooks",
			...result,
		}, startTime);
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to retry webhooks"
		);
	}
}
