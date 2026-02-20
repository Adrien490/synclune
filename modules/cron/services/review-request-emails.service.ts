import { FulfillmentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendReviewRequestEmailInternal } from "@/modules/reviews/services/send-review-request-email.service";
import { ActionStatus } from "@/shared/types/server-action";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";

// Send review request 2 days after delivery
const DAYS_AFTER_DELIVERY = 2;

/**
 * Sends delayed review request emails after order delivery.
 *
 * Sends emails 2-3 days after delivery to give customers time to
 * try the product before asking for a review.
 */
export async function sendDelayedReviewRequestEmails(): Promise<{
	found: number;
	sent: number;
	errors: number;
	hasMore: boolean;
}> {
	console.log(
		"[CRON:review-request-emails] Starting delayed review request emails..."
	);

	const deliveryThreshold = new Date(
		Date.now() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000
	);

	// Find orders delivered more than 2 days ago without a review request sent
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

	console.log(
		`[CRON:review-request-emails] Found ${ordersToNotify.length} orders to send review requests`
	);

	const startTime = Date.now();
	let sent = 0;
	let errors = 0;

	for (const order of ordersToNotify) {
		if (Date.now() - startTime > BATCH_DEADLINE_MS) {
			console.log("[CRON:review-request-emails] Deadline reached, stopping early");
			break;
		}

		try {
			const result = await sendReviewRequestEmailInternal(order.id);

			if (result.status === ActionStatus.SUCCESS) {
				sent++;
				console.log(
					`[CRON:review-request-emails] Sent review request for order ${order.orderNumber}`
				);
			} else {
				console.warn(
					`[CRON:review-request-emails] Failed to send for order ${order.orderNumber}: ${result.message}`
				);
				errors++;
			}
		} catch (error) {
			console.error(
				`[CRON:review-request-emails] Error sending for order ${order.orderNumber}:`,
				error
			);
			errors++;
		}
	}

	console.log(
		`[CRON:review-request-emails] Completed: ${sent} sent, ${errors} errors`
	);

	return {
		found: ordersToNotify.length,
		sent,
		errors,
		hasMore: ordersToNotify.length === BATCH_SIZE_MEDIUM,
	};
}
