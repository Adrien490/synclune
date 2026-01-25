import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupOrphanMedia } from "@/modules/cron/services/cleanup-orphan-media.service";

export const maxDuration = 60; // Plus long car scan UploadThing

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await cleanupOrphanMedia();
		return cronSuccess({
			job: "cleanup-orphan-media",
			filesScanned: result.filesScanned,
			orphansDeleted: result.orphansDeleted,
			errors: result.errors,
		});
	} catch (error) {
		return cronError(
			error instanceof Error ? error.message : "Failed to cleanup orphan media"
		);
	}
}
