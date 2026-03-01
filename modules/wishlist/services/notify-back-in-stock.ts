import { prisma } from "@/shared/lib/prisma";
import { sendBackInStockEmail } from "@/modules/emails/services/wishlist-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

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

		for (const item of wishlistItems) {
			if (!item.wishlist.user || !item.product) continue;

			try {
				const productUrl = buildUrl(`${ROUTES.SHOP.PRODUCTS}/${item.product.slug}`);

				const result = await sendBackInStockEmail({
					to: item.wishlist.user.email,
					customerName: item.wishlist.user.name ?? item.wishlist.user.email,
					productTitle: item.product.title,
					productUrl,
				});

				if (result.success) {
					await prisma.wishlistItem.update({
						where: { id: item.id },
						data: { backInStockNotifiedAt: new Date() },
					});
				}
			} catch (error) {
				console.error(`[BACK-IN-STOCK] Failed to notify for wishlist item ${item.id}:`, error);
			}
		}
	} catch (error) {
		console.error("[BACK-IN-STOCK] Failed to process notifications:", error);
	}
}
