import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { retryFailedWebhooks } from "@/modules/cron/services/retry-webhooks.service";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await retryFailedWebhooks();
		if (!result) {
			return cronError("STRIPE_SECRET_KEY not configured");
		}
		return cronSuccess({
			job: "retry-webhooks",
			found: result.found,
			retried: result.retried,
			succeeded: result.succeeded,
			permanentlyFailed: result.permanentlyFailed,
			errors: result.errors,
			orphansRecovered: result.orphansRecovered,
		});
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to retry webhooks"
		);
	}
}
