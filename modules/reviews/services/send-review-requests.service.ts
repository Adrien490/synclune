import { FulfillmentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { sendReviewRequestEmail } from "@/modules/emails/services/review-emails";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM, THRESHOLDS } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

/**
 * Cron : envoie un email de demande d'avis J+7 après livraison.
 *
 * Cible :
 *  - Order.fulfillmentStatus = DELIVERED
 *  - Order.actualDelivery < now - 7 jours
 *  - Order.reviewRequestSentAt IS NULL  (dedup natif via colonne dédiée)
 *  - Order.userId IS NOT NULL           (seuls les comptes peuvent laisser un avis)
 *  - notDeleted
 *
 * Idempotence :
 *  - `reviewRequestSentAt` est mis à jour APRÈS envoi réussi.
 *  - Si la livraison contient uniquement des produits déjà notés (ou supprimés),
 *    on flag quand même `reviewRequestSentAt` pour éviter de revisiter cette
 *    commande à chaque run.
 *
 * Index DB exploité : `(fulfillmentStatus, actualDelivery, reviewRequestSentAt, deletedAt)`.
 */
export async function sendReviewRequests(): Promise<CronResult> {
	const cutoff = new Date(Date.now() - THRESHOLDS.REVIEW_REQUEST_DELAY_MS);

	const candidates = await prisma.order.findMany({
		where: {
			fulfillmentStatus: FulfillmentStatus.DELIVERED,
			actualDelivery: { lt: cutoff, not: null },
			reviewRequestSentAt: null,
			userId: { not: null },
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			userId: true,
			customerEmail: true,
			customerName: true,
			items: {
				// Filtre Prisma : seuls les items éligibles à un avis (produit non soft-deleted,
				// pas encore noté) remontent ici. Les autres branches ont été pré-écrémées en DB
				// pour épargner de la sérialisation.
				where: {
					review: null,
					sku: { product: { deletedAt: null } },
				},
				select: {
					id: true,
					sku: {
						select: {
							images: {
								take: 1,
								select: { url: true },
							},
							product: {
								select: {
									id: true,
									title: true,
									slug: true,
								},
							},
						},
					},
				},
			},
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { actualDelivery: "asc" },
	});

	logger.info("Review-request candidates loaded", {
		cronJob: "send-review-requests",
		count: candidates.length,
	});

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;

	for (const order of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", {
				cronJob: "send-review-requests",
				processed,
				remaining: candidates.length - processed - errored - skipped,
			});
			break;
		}

		// Build the per-product item list (dedup by productId, skip deleted products
		// and items already reviewed).
		const seenProductIds = new Set<string>();
		const items: Array<{
			productTitle: string;
			productSlug: string;
			productUrl: string;
			productImageUrl: string | null;
		}> = [];

		for (const item of order.items) {
			const product = item.sku.product;
			if (seenProductIds.has(product.id)) continue;
			seenProductIds.add(product.id);
			items.push({
				productTitle: product.title,
				productSlug: product.slug,
				productUrl: buildUrl(ROUTES.SHOP.PRODUCT(product.slug)),
				productImageUrl: item.sku.images[0]?.url ?? null,
			});
		}

		// Even if nothing to ask (all reviewed or deleted), flag as sent so this
		// order doesn't get re-evaluated every cron run.
		if (items.length === 0) {
			try {
				await prisma.order.update({
					where: { id: order.id },
					data: { reviewRequestSentAt: new Date() },
				});
				skipped++;
			} catch (error) {
				errored++;
				logger.error("Failed to flag no-eligible-items order", error, {
					cronJob: "send-review-requests",
					orderId: order.id,
				});
			}
			continue;
		}

		try {
			const unsubscribeUrl = buildUrl(ROUTES.NOTIFICATIONS.UNSUBSCRIBE);
			const result = await sendReviewRequestEmail({
				to: order.customerEmail,
				customerName: order.customerName || "vous",
				orderNumber: order.orderNumber,
				items,
				unsubscribeUrl,
			});

			if (!result.success) {
				errored++;
				logger.error("Resend rejected review-request email", result.error, {
					cronJob: "send-review-requests",
					orderId: order.id,
				});
				continue;
			}

			await prisma.order.update({
				where: { id: order.id },
				data: { reviewRequestSentAt: new Date() },
			});

			processed++;
		} catch (error) {
			errored++;
			logger.error("Failed to send review-request email", error, {
				cronJob: "send-review-requests",
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}
	}

	logger.info("Review-request batch completed", {
		cronJob: "send-review-requests",
		processed,
		errored,
		skipped,
	});

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
		emailsSent: processed,
		ordersWithoutEligibleItems: skipped,
	};
}
