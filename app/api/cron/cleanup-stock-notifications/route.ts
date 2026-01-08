import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupExpiredNotifications } from "@/modules/stock-notifications/actions/cleanup-expired-notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		// Réutilise la fonction existante
		const result = await cleanupExpiredNotifications();
		return cronSuccess({
			job: "cleanup-stock-notifications",
			expiredCount: result.expiredCount,
		});
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to cleanup stock notifications"
		);
	}
}
