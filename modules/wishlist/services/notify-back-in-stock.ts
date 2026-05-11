import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendBackInStockEmail } from "@/modules/emails/services/wishlist-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { logger } from "@/shared/lib/logger";
import { captureWishlistError } from "@/modules/wishlist/utils/capture-wishlist-error";

/** Number of wishlist items processed per batch to bound Resend API latency */
const NOTIFY_BATCH_SIZE = 50;

const NOTIFY_ITEM_SELECT = {
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
			skus: {
				where: { isActive: true },
				select: {
					images: {
						take: 1,
						select: { url: true },
					},
				},
				take: 1,
			},
		},
	},
} as const satisfies Prisma.WishlistItemSelect;

type NotifyItem = Prisma.WishlistItemGetPayload<{ select: typeof NOTIFY_ITEM_SELECT }>;

/**
 * Attempts to send a back-in-stock email for a wishlist item.
 * Returns true on success, false on failure (Sentry already captured for non-recoverable cases).
 */
async function sendNotification(item: NotifyItem, productId: string): Promise<boolean> {
	if (!item.wishlist.user || !item.product) return false;

	try {
		const productUrl = buildUrl(`${ROUTES.SHOP.PRODUCTS}/${item.product.slug}`);
		const unsubscribeUrl = buildUrl(ROUTES.NOTIFICATIONS.UNSUBSCRIBE);
		const productImageUrl = item.product.skus[0]?.images[0]?.url ?? null;

		const result = await sendBackInStockEmail({
			to: item.wishlist.user.email,
			customerName: item.wishlist.user.name ?? item.wishlist.user.email,
			productTitle: item.product.title,
			productImageUrl,
			productUrl,
			unsubscribeUrl,
		});

		return result.success;
	} catch (emailError) {
		captureWishlistError(emailError, {
			service: "back-in-stock",
			stage: "send-email",
			productId,
			wishlistItemId: item.id,
		});
		logger.error(`Failed to notify for wishlist item ${item.id}`, emailError, {
			service: "back-in-stock",
		});
		return false;
	}
}

/**
 * Notifies users who have a product in their wishlist when it comes back in stock.
 * Called after SKU stock update when inventory goes from 0 to >0.
 *
 * Non-blocking: errors are logged and captured to Sentry but don't propagate.
 * Processes all eligible users in batches of 50 using cursor-based pagination.
 *
 * Failed-email recovery: items whose first send fails are queued for a single
 * retry pass after the main loop completes. Permanent failures stay in the
 * `backInStockNotifiedAt: null` queue for a subsequent restock event.
 */
export async function notifyBackInStock(productId: string): Promise<void> {
	const failedItems: NotifyItem[] = [];

	try {
		let cursor: string | undefined;
		let hasMore = true;

		while (hasMore) {
			const wishlistItems = await prisma.wishlistItem.findMany({
				where: {
					productId,
					backInStockNotifiedAt: null,
					wishlist: {
						userId: { not: null },
						user: { deletedAt: null },
					},
				},
				select: NOTIFY_ITEM_SELECT,
				take: NOTIFY_BATCH_SIZE,
				...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
				orderBy: { id: "asc" },
			});

			if (wishlistItems.length === 0) break;

			const notifiedItemIds: string[] = [];

			for (const item of wishlistItems) {
				const success = await sendNotification(item, productId);
				if (success) {
					notifiedItemIds.push(item.id);
				} else {
					failedItems.push(item);
				}
			}

			if (notifiedItemIds.length > 0) {
				await prisma.wishlistItem.updateMany({
					where: { id: { in: notifiedItemIds } },
					data: { backInStockNotifiedAt: new Date() },
				});
			}

			hasMore = wishlistItems.length === NOTIFY_BATCH_SIZE;
			cursor = wishlistItems[wishlistItems.length - 1]!.id;
		}

		// Single retry pass for items whose first send failed.
		// Avoids losing notifications when Resend hiccups during the main loop —
		// items not retried here remain `backInStockNotifiedAt: null` and would
		// be skipped on this run's cursor (already past), so the retry is the
		// last chance to deliver within this restock event.
		if (failedItems.length > 0) {
			logger.info(`Retrying ${failedItems.length} failed back-in-stock notifications`, {
				service: "back-in-stock",
				productId,
			});

			const retrySuccessIds: string[] = [];

			for (const item of failedItems) {
				const success = await sendNotification(item, productId);
				if (success) {
					retrySuccessIds.push(item.id);
				} else {
					captureWishlistError(
						new Error("Permanent back-in-stock notification failure after retry"),
						{
							service: "back-in-stock",
							stage: "retry-exhausted",
							productId,
							wishlistItemId: item.id,
						},
					);
				}
			}

			if (retrySuccessIds.length > 0) {
				await prisma.wishlistItem.updateMany({
					where: { id: { in: retrySuccessIds } },
					data: { backInStockNotifiedAt: new Date() },
				});
			}
		}
	} catch (outerError) {
		captureWishlistError(outerError, {
			service: "back-in-stock",
			stage: "outer-loop",
			productId,
		});
		logger.error("Failed to process back-in-stock notifications", outerError, {
			service: "back-in-stock",
		});
	}
}
