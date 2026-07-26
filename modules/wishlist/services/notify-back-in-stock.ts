import * as Sentry from "@sentry/nextjs";
import { type Prisma, ProductStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { sendBackInStockEmail } from "@/modules/emails/services/wishlist-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { logger } from "@/shared/lib/logger";
import { captureWishlistError } from "@/modules/wishlist/utils/capture-wishlist-error";
import { generateUnsubscribeToken } from "@/modules/notifications/utils/unsubscribe-token";
import { MARKETING_DAILY_EMAIL_BUDGET } from "@/modules/emails/constants/email-budget";
import { delay } from "@/shared/utils/delay";

/** Number of wishlist items processed per batch to bound Resend API latency */
const NOTIFY_BATCH_SIZE = 50;

/**
 * Envois marketing restants pour la journée en cours (audit coûts P1-3).
 *
 * Compte les notifications déjà émises depuis minuit UTC — `backInStockNotifiedAt`
 * fait office de journal d'envoi, aucune table supplémentaire n'est nécessaire.
 * La fenêtre est UTC comme le quota Resend.
 *
 * Approximation assumée : un item retiré de la wishlist après notification
 * disparaît du compte, ce qui peut sous-estimer marginalement les envois du jour.
 * Le budget (40/100) laisse une marge très supérieure à ce biais.
 */
async function remainingMarketingBudget(): Promise<number> {
	const startOfUtcDay = new Date();
	startOfUtcDay.setUTCHours(0, 0, 0, 0);

	const sentToday = await prisma.wishlistItem.count({
		where: { backInStockNotifiedAt: { gte: startOfUtcDay } },
	});

	return Math.max(0, MARKETING_DAILY_EMAIL_BUDGET - sentToday);
}

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
 *
 * Borné par le budget marketing quotidien (audit coûts P1-3) : au-delà, la
 * boucle s'arrête et les inscrits restants gardent `backInStockNotifiedAt: null`.
 * Ils sont repris le lendemain par `drainBackInStockQueue()` — rien n'est perdu,
 * l'envoi est étalé pour ne pas priver le transactionnel du quota Resend du jour.
 *
 * @returns le nombre d'emails effectivement envoyés (budget consommé).
 */
export async function notifyBackInStock(productId: string): Promise<number> {
	return Sentry.startSpan(
		{ name: "wishlist.notify-back-in-stock", attributes: { productId } },
		async (span) => {
			const failedItems: NotifyItem[] = [];
			let processed = 0;
			let errored = 0;
			let retryRecovered = 0;
			let batchesScanned = 0;
			let budgetRemaining = 0;
			let budgetExhausted = false;

			try {
				budgetRemaining = await remainingMarketingBudget();

				if (budgetRemaining === 0) {
					logger.info("Back-in-stock notifications deferred: daily marketing budget spent", {
						service: "back-in-stock",
						productId,
					});
					span.setAttribute("budget_exhausted", true);
					return 0;
				}

				let cursor: string | undefined;
				let hasMore = true;

				while (hasMore && budgetRemaining > 0) {
					// Ne charger que ce que le budget du jour permet d'envoyer : au-delà
					// on rendrait des emails qu'on jetterait, et le curseur avancerait
					// au-delà d'inscrits jamais notifiés.
					const take = Math.min(NOTIFY_BATCH_SIZE, budgetRemaining);

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
								// Opposition marketing (Art. 21 RGPD) : un user désinscrit via
								// /notifications/desinscription ne reçoit plus de back-in-stock.
								user: { deletedAt: null, marketingOptOutAt: null },
							},
						},
						select: NOTIFY_ITEM_SELECT,
						take,
						...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
						orderBy: { id: "asc" },
					});

					if (wishlistItems.length === 0) break;

					batchesScanned += 1;
					const notifiedItemIds: string[] = [];

					for (let i = 0; i < wishlistItems.length; i++) {
						const item = wishlistItems[i]!;
						const success = await sendNotification(item, productId);
						// Un envoi refusé par Resend ne consomme pas de quota : seuls les
						// succès décrémentent le budget.
						if (success) {
							notifiedItemIds.push(item.id);
							processed += 1;
							budgetRemaining -= 1;
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

					// Comparer à `take`, pas à NOTIFY_BATCH_SIZE : quand c'est le budget
					// qui borne la requête, un lot « plein » fait la taille du budget.
					// Comparer à la constante conclurait à tort que la file est vide.
					hasMore = wishlistItems.length === take;
					cursor = wishlistItems[wishlistItems.length - 1]!.id;
				}

				// Budget épuisé alors que la file n'est pas vide : le reliquat part
				// demain via `drainBackInStockQueue()`. Tracé pour que l'étalement soit
				// visible plutôt que silencieux.
				if (budgetRemaining === 0 && hasMore) {
					budgetExhausted = true;
					logger.info("Back-in-stock notifications truncated by daily marketing budget", {
						service: "back-in-stock",
						productId,
						sent: processed,
					});
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
						// Le retry consomme le même quota Resend que l'envoi initial : il
						// s'arrête aussi au budget. Les items non retentés restent en file
						// (`backInStockNotifiedAt: null`) pour le drainage du lendemain.
						if (budgetRemaining === 0) {
							budgetExhausted = true;
							break;
						}
						const item = failedItems[i]!;
						const success = await sendNotification(item, productId);
						if (success) {
							retrySuccessIds.push(item.id);
							retryRecovered += 1;
							processed += 1;
							budgetRemaining -= 1;
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
				span.setAttribute("budget_exhausted", budgetExhausted);
			}

			return processed;
		},
	);
}
