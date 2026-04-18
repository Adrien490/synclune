import { FulfillmentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { sendReviewRequestEmailInternal } from "@/modules/reviews/services/send-review-request-email.service";
import { ActionStatus } from "@/shared/types/server-action";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	EMAIL_THROTTLE_MS,
} from "@/modules/cron/constants/limits";

// Send review request 2 days after delivery
const DAYS_AFTER_DELIVERY = 2;

/**
 * Sends a single review request email after order delivery (no reminder phase).
 */
export async function sendDelayedReviewRequestEmails(): Promise<{
	found: number;
	sent: number;
	errors: number;
	hasMore: boolean;
}> {
	logger.info("Starting delayed review request emails", { cronJob: "review-request-emails" });

	const deliveryThreshold = new Date(Date.now() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000);

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

	logger.info("Review request emails completed", {
		cronJob: "review-request-emails",
		sent,
		errors,
	});

	return {
		found: ordersToNotify.length,
		sent,
		errors,
		hasMore: ordersToNotify.length === BATCH_SIZE_MEDIUM,
	};
}
