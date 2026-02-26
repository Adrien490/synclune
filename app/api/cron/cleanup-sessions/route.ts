import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupExpiredSessions } from "@/modules/cron/services/cleanup-sessions.service";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await cleanupExpiredSessions();
		return cronSuccess({
			job: "cleanup-sessions",
			...result,
		}, startTime);
	} catch (error) {
		sendAdminCronFailedAlert({
			job: "cleanup-sessions",
			errors: 1,
			details: { error: error instanceof Error ? error.message : String(error) },
		}).catch((e) => console.error("[CRON:cleanup-sessions] Failed to send admin alert", e));

		return cronError(
			error instanceof Error ? error.message : "Failed to cleanup sessions"
		);
	}
}
