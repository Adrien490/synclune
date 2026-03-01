import { FulfillmentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { sendReviewRequestEmailInternal } from "@/modules/reviews/services/send-review-request-email.service";
import { sendReviewReminderEmail } from "@/modules/emails/services/review-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { SITE_URL } from "@/shared/constants/seo-config";
import { ActionStatus } from "@/shared/types/server-action";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	EMAIL_THROTTLE_MS,
} from "@/modules/cron/constants/limits";

// Send review request 2 days after delivery
const DAYS_AFTER_DELIVERY = 2;

// Send review reminder 7 days after first request
const DAYS_AFTER_FIRST_REQUEST = 7;

/**
 * Sends delayed review request emails after order delivery.
 *
 * Phase 1: Sends initial emails 2-3 days after delivery.
 * Phase 2: Sends reminder emails 7 days after first request if no review yet.
 */
export async function sendDelayedReviewRequestEmails(): Promise<{
	found: number;
	sent: number;
	errors: number;
	hasMore: boolean;
	remindersFound: number;
	remindersSent: number;
	reminderErrors: number;
}> {
	logger.info("Starting delayed review request emails", { cronJob: "review-request-emails" });

	const deliveryThreshold = new Date(Date.now() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000);

	// === PHASE 1: Initial review requests ===
	const ordersToNotify = await prisma.order.findMany({
		where: {
			...notDeleted,
			fulfillmentStatus: FulfillmentStatus.DELIVERED,
			actualDelivery: {
				lt: deliveryThreshold,
				// Cap at 14 days to avoid spamming old orders
				gt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
			},
			reviewRequestSentAt: null,
		},
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
		},
		take: BATCH_SIZE_MEDIUM,
	});

	logger.info("Found orders to send review requests", {
		cronJob: "review-request-emails",
		count: ordersToNotify.length,
	});

	const startTime = Date.now();
	let sent = 0;
	let errors = 0;

	for (const order of ordersToNotify) {
		if (Date.now() - startTime > BATCH_DEADLINE_MS) {
			logger.info("Deadline reached, stopping early", { cronJob: "review-request-emails" });
			break;
		}

		// Throttle between sends to avoid Resend rate limits
		if (sent > 0 || errors > 0) {
			await new Promise((resolve) => setTimeout(resolve, EMAIL_THROTTLE_MS));
		}

		try {
			const result = await sendReviewRequestEmailInternal(order.id);

			if (result.status === ActionStatus.SUCCESS) {
				sent++;
				logger.info("Sent review request", {
					cronJob: "review-request-emails",
					orderNumber: order.orderNumber,
				});
			} else {
				logger.warn("Failed to send review request", {
					cronJob: "review-request-emails",
					orderNumber: order.orderNumber,
					reason: result.message,
				});
				errors++;
			}
		} catch (error) {
			logger.error("Error sending review request", error, {
				cronJob: "review-request-emails",
				orderNumber: order.orderNumber,
			});
			errors++;
		}
	}

	// === PHASE 2: Reminder emails (7 days after first request, no review yet) ===
	const reminderThreshold = new Date(Date.now() - DAYS_AFTER_FIRST_REQUEST * 24 * 60 * 60 * 1000);

	const ordersToRemind = await prisma.order.findMany({
		where: {
			...notDeleted,
			fulfillmentStatus: FulfillmentStatus.DELIVERED,
			reviewRequestSentAt: { lt: reminderThreshold },
			reviewReminderSentAt: null,
			// Only remind if at least one item has no review
			items: {
				some: {
					review: { is: null },
				},
			},
			user: {
				deletedAt: null,
			},
		},
		select: {
			id: true,
			orderNumber: true,
			customerEmail: true,
			user: {
				select: {
					email: true,
					name: true,
				},
			},
		},
		take: BATCH_SIZE_MEDIUM,
	});

	let remindersSent = 0;
	let reminderErrors = 0;

	if (ordersToRemind.length > 0) {
		logger.info("Found orders for review reminder", {
			cronJob: "review-request-emails",
			count: ordersToRemind.length,
		});

		const reviewUrl = `${SITE_URL}/mes-avis`;
		const unsubscribeUrl = buildUrl(ROUTES.NOTIFICATIONS.UNSUBSCRIBE);

		for (const order of ordersToRemind) {
			if (Date.now() - startTime > BATCH_DEADLINE_MS) {
				logger.info("Deadline reached during reminders", { cronJob: "review-request-emails" });
				break;
			}

			if (remindersSent > 0 || reminderErrors > 0 || sent > 0 || errors > 0) {
				await new Promise((resolve) => setTimeout(resolve, EMAIL_THROTTLE_MS));
			}

			if (!order.user?.email) continue;

			try {
				// Optimistic lock
				await prisma.order.update({
					where: { id: order.id },
					data: { reviewReminderSentAt: new Date() },
				});

				const result = await sendReviewReminderEmail({
					to: order.user.email,
					customerName: order.user.name ?? "Cliente",
					orderNumber: order.orderNumber,
					reviewUrl,
					unsubscribeUrl,
				});

				if (result.success) {
					remindersSent++;
					logger.info("Sent reminder for order", {
						cronJob: "review-request-emails",
						orderNumber: order.orderNumber,
					});
				} else {
					// Rollback on failure
					await prisma.order.update({
						where: { id: order.id },
						data: { reviewReminderSentAt: null },
					});
					reminderErrors++;
				}
			} catch (error) {
				logger.error("Reminder error for order", error, {
					cronJob: "review-request-emails",
					orderNumber: order.orderNumber,
				});
				reminderErrors++;
			}
		}
	}

	logger.info("Review request emails completed", {
		cronJob: "review-request-emails",
		sent,
		errors,
		remindersSent,
		reminderErrors,
	});

	return {
		found: ordersToNotify.length,
		sent,
		errors,
		hasMore:
			ordersToNotify.length === BATCH_SIZE_MEDIUM || ordersToRemind.length === BATCH_SIZE_MEDIUM,
		remindersFound: ordersToRemind.length,
		remindersSent,
		reminderErrors,
	};
}
