import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { processAccountDeletions } from "@/modules/cron/services/process-account-deletions.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 1 minute max

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await processAccountDeletions();
		return cronSuccess({
			job: "process-account-deletions",
			processed: result.processed,
			errors: result.errors,
		});
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to process account deletions"
		);
	}
}
