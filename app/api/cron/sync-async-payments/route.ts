import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { syncAsyncPayments } from "@/modules/cron/services/sync-async-payments.service";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await syncAsyncPayments();
		if (!result) {
			return cronError("STRIPE_SECRET_KEY not configured");
		}
		return cronSuccess({
			job: "sync-async-payments",
			checked: result.checked,
			updated: result.updated,
			errors: result.errors,
			hasMore: result.hasMore,
		});
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to sync async payments"
		);
	}
}
