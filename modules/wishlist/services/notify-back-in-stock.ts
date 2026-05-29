import * as Sentry from "@sentry/nextjs";
import { type Prisma, ProductStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendBackInStockEmail } from "@/modules/emails/services/wishlist-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { logger } from "@/shared/lib/logger";
import { captureWishlistError } from "@/modules/wishlist/utils/capture-wishlist-error";
import { generateUnsubscribeToken } from "@/modules/notifications/utils/unsubscribe-token";
import { delay } from "@/shared/utils/delay";

/** Number of wishlist items processed per batch to bound Resend API latency */
const NOTIFY_BATCH_SIZE = 50;

/**
 * Pause entre deux envois pour rester sous le rate-limit Resend (2 req/s par
 * défaut) sur un restock populaire (N wishlists → N emails séquentiels). Évite
 * la rafale de 429 qui ouvrirait le circuit breaker (`resendCircuitBreaker`),
 * lequel se mettrait alors à droper les emails. ~2,8 envois/s avec le coût
 * render+réseau déjà présent. Sautée après le dernier item d'une boucle.
 */
const NOTIFY_SEND_INTERVAL_MS = 350;

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
		const recipientEmail = item.wishlist.user.email;
		const unsubscribeUrl = buildUrl(
			`${ROUTES.NOTIFICATIONS.UNSUBSCRIBE}?email=${encodeURIComponent(recipientEmail)}&token=${generateUnsubscribeToken(recipientEmail)}`,
		);
		const productImageUrl = item.product.skus[0]?.images[0]?.url ?? null;

		const result = await sendBackInStockEmail({
			to: item.wishlist.user.email,
			customerName: item.wishlist.user.name ?? item.wishlist.user.email,
			productTitle: item.product.title,
			productImageUrl,
			productUrl,
			unsubscribeUrl,
			// EMAIL-AUDIT-102 : backstop dedup Resend 24h par item, complète le flag
			// DB `backInStockNotifiedAt` posé après l'envoi (non-atomique).
			idempotencyKey: `back-in-stock:${item.id}`,
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
	return Sentry.startSpan(
		{ name: "wishlist.notify-back-in-stock", attributes: { productId } },
		async (span) => {
			const failedItems: NotifyItem[] = [];
			let processed = 0;
			let errored = 0;
			let retryRecovered = 0;
			let batchesScanned = 0;

			try {
				let cursor: string | undefined;
				let hasMore = true;

				while (hasMore) {
					const wishlistItems = await prisma.wishlistItem.findMany({
						where: {
							productId,
							backInStockNotifiedAt: null,
							// BIZ-BUG-002 : ne notifier que pour un produit réellement
							// achetable. Un produit archivé/brouillon/soft-deleted dont un
							// SKU est restocké ne doit pas générer d'email « revenu en
							// stock » (lien produit ⇒ 404, atteinte image).
							product: {
								status: ProductStatus.PUBLIC,
								deletedAt: null,
							},
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

					batchesScanned += 1;
					const notifiedItemIds: string[] = [];

					for (let i = 0; i < wishlistItems.length; i++) {
						const item = wishlistItems[i]!;
						const success = await sendNotification(item, productId);
						if (success) {
							notifiedItemIds.push(item.id);
							processed += 1;
						} else {
							failedItems.push(item);
						}
						// Throttle entre envois (sauf le dernier du lot) pour ne pas
						// saturer le rate-limit Resend.
						if (i < wishlistItems.length - 1) await delay(NOTIFY_SEND_INTERVAL_MS);
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

					for (let i = 0; i < failedItems.length; i++) {
						const item = failedItems[i]!;
						const success = await sendNotification(item, productId);
						if (success) {
							retrySuccessIds.push(item.id);
							retryRecovered += 1;
							processed += 1;
						} else {
							errored += 1;
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
						// Throttle entre envois (sauf le dernier) — idem boucle principale.
						if (i < failedItems.length - 1) await delay(NOTIFY_SEND_INTERVAL_MS);
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
			} finally {
				span.setAttribute("processed_count", processed);
				span.setAttribute("errored_count", errored);
				span.setAttribute("retry_recovered_count", retryRecovered);
				span.setAttribute("batches_scanned", batchesScanned);
			}
		},
	);
}
