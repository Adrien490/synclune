import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { RETENTION } from "@/modules/cron/constants/limits";

/**
 * Cleans up unconfirmed newsletter subscriptions.
 *
 * Deletes PENDING subscriptions where the double opt-in was not
 * completed within 7 days of signup.
 */
export async function cleanupUnconfirmedNewsletterSubscriptions(): Promise<{
	deleted: number;
}> {
	console.log(
		"[CRON:cleanup-newsletter] Starting unconfirmed subscriptions cleanup..."
	);

	const expiryDate = new Date(
		Date.now() - RETENTION.NEWSLETTER_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000
	);

	// Delete unconfirmed subscriptions past the 7-day window
	const deleteResult = await prisma.newsletterSubscriber.deleteMany({
		where: {
			status: NewsletterStatus.PENDING,
			confirmationSentAt: { lt: expiryDate },
			confirmedAt: null,
		},
	});

	console.log(
		`[CRON:cleanup-newsletter] Deleted ${deleteResult.count} unconfirmed subscriptions`
	);

	return {
		deleted: deleteResult.count,
	};
}
