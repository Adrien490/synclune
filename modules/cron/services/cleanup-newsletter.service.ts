import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { CLEANUP_DELETE_LIMIT, RETENTION, BATCH_SIZE_LARGE } from "@/modules/cron/constants/limits";

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
	console.log("[CRON:cleanup-newsletter] Starting unconfirmed subscriptions cleanup...");

	try {
		const expiryDate = new Date(
			Date.now() - RETENTION.NEWSLETTER_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000,
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

		const hasMore = toDelete.length === CLEANUP_DELETE_LIMIT;

		if (hasMore) {
			console.warn(
				"[CRON:cleanup-newsletter] Delete limit reached, remaining will be cleaned on next run",
			);
		}

		console.log(
			`[CRON:cleanup-newsletter] Deleted ${deleteResult.count} unconfirmed subscriptions`,
		);

		return {
			deleted: deleteResult.count,
			hasMore,
		};
	} catch (error) {
		console.error(
			"[CRON:cleanup-newsletter] Error during cleanup:",
			error instanceof Error ? error.message : String(error),
		);
		throw error;
	}
}

/**
 * Unsubscribes confirmed newsletter subscribers inactive for 3+ years.
 *
 * Inactivity is determined by confirmedAt date (no email open tracking).
 * Matches the retention policy stated in /confidentialite:
 * "Jusqu'à désinscription ou 3 ans d'inactivité"
 */
export async function unsubscribeInactiveNewsletterSubscribers(): Promise<{
	unsubscribed: number;
	hasMore: boolean;
}> {
	console.log("[CRON:cleanup-newsletter] Starting inactive subscribers cleanup...");

	try {
		const inactivityDate = new Date(
			Date.now() - RETENTION.NEWSLETTER_INACTIVITY_YEARS * 365 * 24 * 60 * 60 * 1000,
		);

		// Find confirmed subscribers whose confirmation date is older than 3 years
		const toUnsubscribe = await prisma.newsletterSubscriber.findMany({
			where: {
				status: NewsletterStatus.CONFIRMED,
				confirmedAt: { lt: inactivityDate },
			},
			select: { id: true },
			take: BATCH_SIZE_LARGE,
		});

		if (toUnsubscribe.length === 0) {
			console.log("[CRON:cleanup-newsletter] No inactive subscribers found");
			return { unsubscribed: 0, hasMore: false };
		}

		const updateResult = await prisma.newsletterSubscriber.updateMany({
			where: { id: { in: toUnsubscribe.map((s) => s.id) } },
			data: {
				status: NewsletterStatus.UNSUBSCRIBED,
				unsubscribedAt: new Date(),
			},
		});

		const hasMore = toUnsubscribe.length === BATCH_SIZE_LARGE;

		if (hasMore) {
			console.warn(
				"[CRON:cleanup-newsletter] Batch limit reached for inactive subscribers, remaining will be processed on next run",
			);
		}

		console.log(
			`[CRON:cleanup-newsletter] Unsubscribed ${updateResult.count} inactive subscribers (confirmed > ${RETENTION.NEWSLETTER_INACTIVITY_YEARS} years ago)`,
		);

		return {
			unsubscribed: updateResult.count,
			hasMore,
		};
	} catch (error) {
		console.error(
			"[CRON:cleanup-newsletter] Error during inactive cleanup:",
			error instanceof Error ? error.message : String(error),
		);
		throw error;
	}
}
