import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { reconcilePendingRefunds } from "@/modules/cron/services/reconcile-refunds.service";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await reconcilePendingRefunds();
		if (!result) {
			return cronError("STRIPE_SECRET_KEY not configured");
		}
		return cronSuccess({
			job: "reconcile-refunds",
			checked: result.checked,
			updated: result.updated,
			errors: result.errors,
			hasMore: result.hasMore,
		});
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to reconcile refunds"
		);
	}
}
