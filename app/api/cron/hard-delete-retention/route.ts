import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { hardDeleteExpiredRecords } from "@/modules/cron/services/hard-delete-retention.service";

export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	const startTime = cronTimer();
	try {
		const result = await hardDeleteExpiredRecords();
		return cronSuccess({
			job: "hard-delete-retention",
			...result,
		}, startTime);
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to hard delete expired records"
		);
	}
}
