import { verifyCronRequest, cronSuccess, cronError } from "@/modules/cron/lib/verify-cron";
import { cleanupUnconfirmedNewsletterSubscriptions } from "@/modules/cron/services/cleanup-newsletter.service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
	const unauthorized = await verifyCronRequest();
	if (unauthorized) return unauthorized;

	try {
		const result = await cleanupUnconfirmedNewsletterSubscriptions();
		return cronSuccess({
			job: "cleanup-newsletter",
			deleted: result.deleted,
		});
	} catch (error) {
		return cronError(
			error instanceof Error
				? error.message
				: "Failed to cleanup newsletter subscriptions"
		);
	}
}
