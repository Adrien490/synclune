import { FulfillmentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendCrossSellEmail } from "@/modules/emails/services/cross-sell-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	EMAIL_THROTTLE_MS,
} from "@/modules/cron/constants/limits";

// Send cross-sell email 7 days after delivery
const DAYS_AFTER_DELIVERY = 7;

// Maximum suggested products per email
const MAX_SUGGESTIONS = 4;

/**
 * Sends cross-sell emails to customers 7 days after delivery.
 * Suggests products from the same type/collections they ordered.
 */
export async function sendCrossSellEmails(): Promise<{
	found: number;
	sent: number;
	skipped: number;
	errors: number;
	hasMore: boolean;
}> {
	console.log("[CRON:cross-sell-emails] Starting cross-sell emails...");

	const deliveryThreshold = new Date(Date.now() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000);

	// Find delivered orders 7+ days ago, with a user, not yet sent cross-sell
	const ordersToProcess = await prisma.order.findMany({
		where: {
			...notDeleted,
			fulfillmentStatus: FulfillmentStatus.DELIVERED,
			actualDelivery: {
				lt: deliveryThreshold,
				// Cap at 30 days
				gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			},
			crossSellEmailSentAt: null,
			userId: { not: null },
			user: { deletedAt: null },
		},
		select: {
			id: true,
			orderNumber: true,
			userId: true,
			user: {
				select: {
					email: true,
					name: true,
				},
			},
			items: {
				select: {
					productId: true,
					sku: {
						select: {
							product: {
								select: {
									typeId: true,
									collections: {
										select: { collectionId: true },
									},
								},
							},
						},
					},
				},
			},
		},
		take: BATCH_SIZE_MEDIUM,
	});

	console.log(`[CRON:cross-sell-emails] Found ${ordersToProcess.length} orders for cross-sell`);

	const startTime = Date.now();
	let sent = 0;
	let skipped = 0;
	let errors = 0;
	const shopUrl = buildUrl(ROUTES.SHOP.PRODUCTS);
	const unsubscribeUrl = buildUrl(ROUTES.NOTIFICATIONS.UNSUBSCRIBE);

	for (const order of ordersToProcess) {
		if (Date.now() - startTime > BATCH_DEADLINE_MS) {
			console.log("[CRON:cross-sell-emails] Deadline reached, stopping early");
			break;
		}

		if (sent > 0 || errors > 0 || skipped > 0) {
			await new Promise((resolve) => setTimeout(resolve, EMAIL_THROTTLE_MS));
		}

		if (!order.user?.email) continue;

		try {
			// Collect product type and collection IDs from the order
			const purchasedProductIds = order.items
				.map((item) => item.productId)
				.filter((id): id is string => id !== null);

			const typeIds = order.items
				.map((item) => item.sku.product.typeId)
				.filter((id): id is string => id !== null);

			const collectionIds = order.items.flatMap((item) =>
				item.sku.product.collections.map((c) => c.collectionId),
			);

			if (typeIds.length === 0 && collectionIds.length === 0) {
				// Mark as sent to avoid re-processing
				await prisma.order.update({
					where: { id: order.id },
					data: { crossSellEmailSentAt: new Date() },
				});
				skipped++;
				continue;
			}

			// Find related products not already purchased
			const suggestions = await prisma.product.findMany({
				where: {
					status: "PUBLIC",
					...notDeleted,
					id: { notIn: purchasedProductIds },
					skus: {
						some: {
							isActive: true,
							inventory: { gt: 0 },
						},
					},
					OR: [
						...(typeIds.length > 0 ? [{ typeId: { in: typeIds } }] : []),
						...(collectionIds.length > 0
							? [{ collections: { some: { collectionId: { in: collectionIds } } } }]
							: []),
					],
				},
				select: {
					title: true,
					slug: true,
					skus: {
						where: { isActive: true },
						select: {
							priceInclTax: true,
							images: {
								take: 1,
								select: { url: true },
							},
						},
						take: 1,
					},
				},
				take: MAX_SUGGESTIONS,
			});

			if (suggestions.length === 0) {
				await prisma.order.update({
					where: { id: order.id },
					data: { crossSellEmailSentAt: new Date() },
				});
				skipped++;
				continue;
			}

			const products = suggestions.map((p) => ({
				title: p.title,
				imageUrl: p.skus[0]?.images[0]?.url ?? null,
				price: p.skus[0]?.priceInclTax ?? 0,
				productUrl: buildUrl(`${ROUTES.SHOP.PRODUCTS}/${p.slug}`),
			}));

			// Optimistic lock
			await prisma.order.update({
				where: { id: order.id },
				data: { crossSellEmailSentAt: new Date() },
			});

			const result = await sendCrossSellEmail({
				to: order.user.email,
				customerName: order.user.name ?? "Cliente",
				products,
				shopUrl,
				unsubscribeUrl,
			});

			if (result.success) {
				sent++;
				console.log(`[CRON:cross-sell-emails] Sent to ${order.user.email}`);
			} else {
				// Rollback on failure
				await prisma.order.update({
					where: { id: order.id },
					data: { crossSellEmailSentAt: null },
				});
				errors++;
			}
		} catch (error) {
			console.error(`[CRON:cross-sell-emails] Error for order ${order.orderNumber}:`, error);
			errors++;
		}
	}

	console.log(
		`[CRON:cross-sell-emails] Completed: ${sent} sent, ${skipped} skipped, ${errors} errors`,
	);

	return {
		found: ordersToProcess.length,
		sent,
		skipped,
		errors,
		hasMore: ordersToProcess.length === BATCH_SIZE_MEDIUM,
	};
}
