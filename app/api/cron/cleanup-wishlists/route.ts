import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupExpiredWishlists } from "@/modules/cron/services/cleanup-wishlists.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await cleanupExpiredWishlists();
		return cronSuccess({
			job: "cleanup-wishlists",
			...result,
		}, startTime);
	} catch (error) {
		sendAdminCronFailedAlert({
			job: "cleanup-wishlists",
			errors: 1,
			details: { error: error instanceof Error ? error.message : String(error) },
		}).catch((e) => console.error("[CRON:cleanup-wishlists] Failed to send admin alert", e));

		return cronError(
			error instanceof Error ? error.message : "Failed to cleanup wishlists"
		);
	}
}
