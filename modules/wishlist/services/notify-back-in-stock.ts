import { prisma } from "@/shared/lib/prisma";
import { sendBackInStockEmail } from "@/modules/emails/services/wishlist-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { logger } from "@/shared/lib/logger";

/**
 * Notifies users who have a product in their wishlist when it comes back in stock.
 * Called after SKU stock update when inventory goes from 0 to >0.
 *
 * Non-blocking: errors are logged but don't propagate.
 */
export async function notifyBackInStock(productId: string): Promise<void> {
	try {
		// Find wishlist items for this product belonging to authenticated users (with email)
		const wishlistItems = await prisma.wishlistItem.findMany({
			where: {
				productId,
				backInStockNotifiedAt: null,
				wishlist: {
					userId: { not: null },
					user: { deletedAt: null },
				},
			},
			select: {
				id: true,
				wishlist: {
					select: {
						user: {
							select: {
								email: true,
								name: true,
							},
						},
					},
				},
				product: {
					select: {
						title: true,
						slug: true,
					},
				},
			},
			take: 50,
		});

		if (wishlistItems.length === 0) return;

		// Collect IDs of successfully notified items for batch update
		const notifiedItemIds: string[] = [];

		for (const item of wishlistItems) {
			if (!item.wishlist.user || !item.product) continue;

			try {
				const productUrl = buildUrl(`${ROUTES.SHOP.PRODUCTS}/${item.product.slug}`);
				const unsubscribeUrl = buildUrl(ROUTES.NOTIFICATIONS.UNSUBSCRIBE);

				const result = await sendBackInStockEmail({
					to: item.wishlist.user.email,
					customerName: item.wishlist.user.name ?? item.wishlist.user.email,
					productTitle: item.product.title,
					productUrl,
					unsubscribeUrl,
				});

				if (result.success) {
					notifiedItemIds.push(item.id);
				}
			} catch (emailError) {
				logger.error(`Failed to notify for wishlist item ${item.id}`, emailError, {
					service: "back-in-stock",
				});
			}
		}

		// Batch update all successfully notified items in a single query
		if (notifiedItemIds.length > 0) {
			await prisma.wishlistItem.updateMany({
				where: { id: { in: notifiedItemIds } },
				data: { backInStockNotifiedAt: new Date() },
			});
		}
	} catch (outerError) {
		logger.error("Failed to process back-in-stock notifications", outerError, {
			service: "back-in-stock",
		});
	}
}
