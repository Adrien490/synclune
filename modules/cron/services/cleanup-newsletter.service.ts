import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { CLEANUP_DELETE_LIMIT, RETENTION } from "@/modules/cron/constants/limits";

/**
 * Cleans up unconfirmed newsletter subscriptions.
 *
 * Deletes PENDING subscriptions where the double opt-in was not
 * completed within 7 days of signup.
 */
export async function cleanupUnconfirmedNewsletterSubscriptions(): Promise<{
	deleted: number;
	hasMore: boolean;
}> {
	console.log(
		"[CRON:cleanup-newsletter] Starting unconfirmed subscriptions cleanup..."
	);

	const expiryDate = new Date(
		Date.now() - RETENTION.NEWSLETTER_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000
	);

	// Find expired subscriptions (bounded)
	const toDelete = await prisma.newsletterSubscriber.findMany({
		where: {
			status: NewsletterStatus.PENDING,
			confirmationSentAt: { lt: expiryDate },
			confirmedAt: null,
		},
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const deleteResult = await prisma.newsletterSubscriber.deleteMany({
		where: { id: { in: toDelete.map((s) => s.id) } },
	});

	if (toDelete.length === CLEANUP_DELETE_LIMIT) {
		console.warn(
			"[CRON:cleanup-newsletter] Delete limit reached, remaining will be cleaned on next run"
		);
	}

	console.log(
		`[CRON:cleanup-newsletter] Deleted ${deleteResult.count} unconfirmed subscriptions`
	);

	return {
		deleted: deleteResult.count,
		hasMore: toDelete.length === CLEANUP_DELETE_LIMIT,
	};
}
