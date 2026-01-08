import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupExpiredSessions } from "@/modules/cron/services/cleanup-sessions.service";

export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await cleanupExpiredSessions();
		return cronSuccess({
			job: "cleanup-sessions",
			sessionsDeleted: result.sessionsDeleted,
			verificationsDeleted: result.verificationsDeleted,
			tokensCleared: result.tokensCleared,
		});
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to cleanup sessions"
		);
	}
}
