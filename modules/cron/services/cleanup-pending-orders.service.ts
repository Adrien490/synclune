import { updateTag } from "next/cache";
import {
	OrderStatus,
	PaymentStatus,
	HistorySource,
	OrderAction,
} from "@/app/generated/prisma/client";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
import { logger } from "@/shared/lib/logger";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { BATCH_DEADLINE_MS, BATCH_SIZE_LARGE, THRESHOLDS } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

/**
 * AM-5 — seuil de détection SPOF `sync-async-payments`.
 *
 * Toute commande `PENDING` portant un `stripePaymentIntentId` est censée être
 * réconciliée par `sync-async-payments` (poll Stripe dès 1h, toutes les 4h).
 * Si une telle commande dépasse ce seuil (7 jours, très au-delà de la portée du
 * poll), c'est que `sync-async-payments` est en panne durable — et comme
 * `cleanup-pending-orders` exclut volontairement les commandes à PI (pour ne pas
 * racer ce cron), aucun second filet ne les ferme. On émet donc une alerte
 * monitoring (lecture seule, zéro mutation → race-safe par construction) pour
 * transformer ce SPOF silencieux en signal actionnable.
 */
const SYNC_ASYNC_SPOF_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cancels stale PENDING orders left behind by abandoned checkouts.
 *
 * Scope: orders where status=PENDING + paymentStatus=PENDING + stripePaymentIntentId IS NULL
 * older than PENDING_ORDER_TIMEOUT_MS (24h).
 *
 * Why we exclude orders with stripePaymentIntentId: dans le flux Elements actuel,
 * TOUTE commande créée par `confirmCheckout` porte un `stripePaymentIntentId`
 * (order-creation.service.ts) — c'est `sync-async-payments` qui est désormais
 * propriétaire de leur réconciliation : il interroge Stripe et résout les PI
 * `succeeded` (→ PAID) comme les PI durablement non finalisés / abandonnés
 * (`requires_action`/`requires_confirmation`/`requires_payment_method`/`canceled`
 * → cancel + FAILED, cf. F1 2026-05-29). Y toucher ici racerait ce cron.
 * Ce cron ne couvre donc que les éventuelles commandes legacy à PI nul (aucune
 * dans la config actuelle — filet de sécurité conservé sans coût).
 *
 * Effects per order (atomic):
 *  - status → CANCELLED
 *  - stock restored (inventory increment)
 *  - discount usages released (usageCount decrement + DiscountUsage delete)
 *  - audit trail (HistorySource.SYSTEM, OrderAction.CANCELLED)
 *
 * No email sent to the customer: the checkout session was abandoned, so there
 * is no reasonable expectation that a confirmation/cancellation would be useful.
 */
export async function cleanupPendingOrders(): Promise<CronResult> {
	const cutoff = new Date(Date.now() - THRESHOLDS.PENDING_ORDER_TIMEOUT_MS);

	const candidates = await prisma.order.findMany({
		where: {
			status: OrderStatus.PENDING,
			paymentStatus: PaymentStatus.PENDING,
			stripePaymentIntentId: null,
			createdAt: { lt: cutoff },
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			createdAt: true,
			// CACHE-AUDIT-005 : invalider les tags user-scopés pour les pending
			// abandonnés d'un client connecté.
			userId: true,
			items: { select: { id: true, skuId: true, quantity: true } },
		},
		take: BATCH_SIZE_LARGE,
		orderBy: { createdAt: "asc" },
	});

	logger.info("Cleanup candidates loaded", {
		cronJob: "cleanup-pending-orders",
		count: candidates.length,
	});

	let processed = 0;
	let errored = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>([
		ORDERS_CACHE_TAGS.LIST,
		SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	]);

	for (const order of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", {
				cronJob: "cleanup-pending-orders",
				processed,
				remaining: candidates.length - processed - errored,
			});
			break;
		}

		try {
			await prisma.$transaction(
				async (tx) => {
					const fresh = await tx.order.findUnique({
						where: { id: order.id, ...notDeleted },
						select: { status: true, paymentStatus: true, stripePaymentIntentId: true },
					});
					if (
						!fresh ||
						fresh.status !== OrderStatus.PENDING ||
						fresh.paymentStatus !== PaymentStatus.PENDING ||
						fresh.stripePaymentIntentId !== null
					) {
						return;
					}

					await tx.order.update({
						where: { id: order.id },
						data: { status: OrderStatus.CANCELLED },
					});

					for (const item of order.items) {
						await tx.productSku.update({
							where: { id: item.skuId },
							data: { inventory: { increment: item.quantity } },
						});
						tagsToInvalidate.add(PRODUCTS_CACHE_TAGS.SKU_STOCK(item.skuId));
					}

					const usages = await tx.discountUsage.findMany({
						where: { orderId: order.id },
						select: { id: true, discountId: true },
					});
					for (const usage of usages) {
						await tx.discount.update({
							where: { id: usage.discountId },
							data: { usageCount: { decrement: 1 } },
						});
					}
					if (usages.length > 0) {
						await tx.discountUsage.deleteMany({ where: { orderId: order.id } });
					}

					await createOrderAuditTx(tx, {
						orderId: order.id,
						action: OrderAction.CANCELLED,
						previousStatus: OrderStatus.PENDING,
						newStatus: OrderStatus.CANCELLED,
						note: "Auto-annulation : panier abandonné (>24h sans paiement)",
						authorName: "Système",
						source: HistorySource.SYSTEM,
						metadata: {
							reason: "abandoned_checkout",
							itemsCount: order.items.length,
							releasedDiscountsCount: usages.length,
							ageHours: Math.floor((Date.now() - order.createdAt.getTime()) / (60 * 60 * 1000)),
						},
					});
				},
				{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
			);

			// CACHE-AUDIT-005 : tags user-scopés + détail commande (helper canonique).
			for (const tag of getOrderInvalidationTags(order.userId ?? undefined, order.id)) {
				tagsToInvalidate.add(tag);
			}
			processed++;
		} catch (error) {
			errored++;
			logger.error("Failed to cancel stale pending order", error, {
				cronJob: "cleanup-pending-orders",
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}
	}

	if (processed > 0) {
		for (const tag of tagsToInvalidate) {
			updateTag(tag);
		}
	}

	// AM-5 — tripwire SPOF : détecte les commandes PENDING à PI anormalement
	// vieilles, signe que `sync-async-payments` (leur unique filet) est en panne.
	// Lecture seule : on n'agit jamais sur ces commandes ici (cela racerait
	// sync-async). On compte et on alerte l'admin.
	const spofCutoff = new Date(Date.now() - SYNC_ASYNC_SPOF_THRESHOLD_MS);
	const stalePiPendingCount = await prisma.order.count({
		where: {
			status: OrderStatus.PENDING,
			paymentStatus: PaymentStatus.PENDING,
			stripePaymentIntentId: { not: null },
			createdAt: { lt: spofCutoff },
			...notDeleted,
		},
	});
	if (stalePiPendingCount > 0) {
		logger.error(
			`${stalePiPendingCount} PENDING order(s) with a PaymentIntent older than 7 days — sync-async-payments likely failing`,
			undefined,
			{ cronJob: "cleanup-pending-orders", stalePiPendingCount },
		);
		await sendAdminCronFailedAlert({
			job: "sync-async-payments (SPOF tripwire)",
			errors: stalePiPendingCount,
			details: {
				issue: "stale-pending-pi-orders",
				thresholdDays: 7,
				count: stalePiPendingCount,
				hint: "Vérifier que le cron sync-async-payments s'exécute (Vercel) — il est le seul filet de réconciliation des commandes PENDING à PaymentIntent.",
			},
		}).catch((e) =>
			logger.error("Failed to send SPOF tripwire alert", e, {
				cronJob: "cleanup-pending-orders",
			}),
		);
	}

	logger.info("Cleanup completed", {
		cronJob: "cleanup-pending-orders",
		processed,
		errored,
		stalePiPendingCount,
	});

	return {
		processed,
		errored,
		skipped: Math.max(0, candidates.length - processed - errored),
		hasMore: candidates.length === BATCH_SIZE_LARGE,
		cancelled: processed,
	};
}
