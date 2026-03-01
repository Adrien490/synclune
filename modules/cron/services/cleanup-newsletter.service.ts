import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
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
	logger.info("Starting unconfirmed subscriptions cleanup", { cronJob: "cleanup-newsletter" });

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
			logger.warn("Delete limit reached, remaining will be cleaned on next run", {
				cronJob: "cleanup-newsletter",
			});
		}

		logger.info("Deleted unconfirmed subscriptions", {
			cronJob: "cleanup-newsletter",
			count: deleteResult.count,
		});

		return {
			deleted: deleteResult.count,
			hasMore,
		};
	} catch (error) {
		logger.error("Error during cleanup", error, { cronJob: "cleanup-newsletter" });
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
	logger.info("Starting inactive subscribers cleanup", { cronJob: "cleanup-newsletter" });

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
			logger.info("No inactive subscribers found", { cronJob: "cleanup-newsletter" });
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
			logger.warn(
				"Batch limit reached for inactive subscribers, remaining will be processed on next run",
				{ cronJob: "cleanup-newsletter" },
			);
		}

		logger.info("Unsubscribed inactive subscribers", {
			cronJob: "cleanup-newsletter",
			count: updateResult.count,
			inactivityYears: RETENTION.NEWSLETTER_INACTIVITY_YEARS,
		});

		return {
			unsubscribed: updateResult.count,
			hasMore,
		};
	} catch (error) {
		logger.error("Error during inactive cleanup", error, { cronJob: "cleanup-newsletter" });
		throw error;
	}
}
