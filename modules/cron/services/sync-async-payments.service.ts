import type Stripe from "stripe";
import { updateTag } from "next/cache";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	markOrderAsFailed,
	extractPaymentFailureDetails,
	restoreStockForOrder,
} from "@/modules/webhooks/services/payment-intent.service";
import { processOrderFromPaymentIntent } from "@/modules/webhooks/services/checkout.service";
import { ensureInvoiceNumberPersisted } from "@/modules/orders/services/ensure-invoice-number.service";
import { recordSalesEReportingDeferrable } from "@/modules/invoices/services/defer-ereporting-retry.service";
import { extractPaymentMethodFromPaymentIntent } from "@/modules/payments/services/map-stripe-payment-method";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";

/**
 * Synchronizes async payment statuses by polling Stripe.
 *
 * Async payment methods (SEPA Direct Debit, Sofort, etc.) can take
 * 3-5 business days to confirm. This cron polls Stripe to reconcile
 * statuses in case of webhook failure.
 */
export async function syncAsyncPayments(): Promise<CronResult> {
	logger.info("Starting async payment sync", { cronJob: "sync-async-payments" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.warn("STRIPE_SECRET_KEY not configured — skipping run", {
			cronJob: "sync-async-payments",
		});
		return {
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		};
	}

	// Find PENDING orders with a PI, older than 1h.
	// F4 (2026-05-29) : la borne haute (10 jours) a été retirée. Elle laissait
	// figer définitivement une commande dont le PI passe `succeeded` après J+10
	// avec un webhook raté = débit encaissé sans Order traitée, sans facture
	// (viole l'émission à l'encaissement, Art. 289-I CGI). Le pool reste borné
	// car la branche F1 (cancel + FAILED des PI durablement non finalisés) draine
	// les PENDING abandonnés ; on traite les plus anciens d'abord (les plus à risque).
	const minAge = new Date(Date.now() - THRESHOLDS.ASYNC_PAYMENT_MIN_AGE_MS);

	const pendingOrders = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PENDING,
			stripePaymentIntentId: { not: null },
			createdAt: {
				lt: minAge,
			},
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			stripePaymentIntentId: true,
			paymentStatus: true,
			// CACHE-AUDIT-004 : nécessaire pour invalider les tags user-scopés.
			userId: true,
			// P2-1 : notifier le client à l'échec/abandon (parité avec le webhook
			// handlePaymentFailure qui envoie déjà PAYMENT_FAILED_EMAIL).
			customerEmail: true,
			customerName: true,
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	logger.info("Found pending orders to check", {
		cronJob: "sync-async-payments",
		count: pendingOrders.length,
	});

	let updated = 0;
	let errors = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();
	const stockRestoreFailures: Array<{
		orderId: string;
		orderNumber: string;
		error: string;
	}> = [];

	// Webhook raté : un PI confirmé `succeeded` qu'on rejoue via le même chemin
	// que le webhook (décrément stock + désactivation SKU + clear cart + facture
	// + e-reporting). Idempotent via le guard `paymentStatus === "PAID"`.
	const processPaidOrder = async (
		orderId: string,
		pi: Stripe.PaymentIntent,
		userId: string | null,
	): Promise<void> => {
		const paymentMethod = (await extractPaymentMethodFromPaymentIntent(pi)) ?? undefined;
		await processOrderFromPaymentIntent(orderId, pi, paymentMethod);
		await ensureInvoiceNumberPersisted(orderId);
		// EINV-EREPORT-009 : deferrable — flag de rattrapage si l'enregistrement échoue.
		await recordSalesEReportingDeferrable(orderId);
		// CACHE-AUDIT-004 : tags user-scopés + détail commande.
		for (const tag of getOrderInvalidationTags(userId ?? undefined, orderId)) {
			tagsToInvalidate.add(tag);
		}
	};

	// Échec/abandon paiement : restore stock (no-op si jamais décrémenté) PUIS
	// markOrderAsFailed. OPS-AUDIT-003 : restore d'abord — si ça throw, on garde
	// la commande PENDING pour le prochain run (retry atomique sans flag DB).
	const failOrder = async (
		orderId: string,
		piId: string,
		pi: Stripe.PaymentIntent,
	): Promise<{ ok: true; restoredSkuIds: string[] } | { ok: false; error: string }> => {
		let stockResult: Awaited<ReturnType<typeof restoreStockForOrder>>;
		try {
			stockResult = await restoreStockForOrder(orderId);
		} catch (stockError) {
			return {
				ok: false,
				error: stockError instanceof Error ? stockError.message : String(stockError),
			};
		}
		await markOrderAsFailed(orderId, piId, extractPaymentFailureDetails(pi));
		return { ok: true, restoredSkuIds: stockResult.restoredSkuIds };
	};

	for (const order of pendingOrders) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: "sync-async-payments" });
			break;
		}
		if (!order.stripePaymentIntentId) continue;

		try {
			// Throttle every call (uniform pacing, cap burst at 1/STRIPE_THROTTLE_MS req/s).
			await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));
			const paymentIntent = await stripe.paymentIntents.retrieve(
				order.stripePaymentIntentId,
				undefined,
				{
					timeout: STRIPE_TIMEOUT_MS,
				},
			);

			const status = paymentIntent.status;

			if (status === "succeeded") {
				// Payment succeeded but webhook was missed (ORD-STRIPE-001).
				logger.info("Order payment succeeded (webhook missed)", {
					cronJob: "sync-async-payments",
					orderNumber: order.orderNumber,
				});
				await processPaidOrder(order.id, paymentIntent, order.userId);
				updated++;
				continue;
			}

			// F1 (2026-05-29) : un PI durablement non finalisé — 3DS abandonné
			// (`requires_action`) ou jamais confirmé (`requires_confirmation`) —
			// n'émet aucun webhook terminal. Le cron ne sélectionnant que des
			// commandes > 1h (ASYNC_PAYMENT_MIN_AGE_MS), un tel PI est abandonné :
			// on l'annule côté Stripe AVANT de marquer FAILED, sinon un client qui
			// revient finaliser le 3DS plus tard provoquerait un débit surprise sur
			// une commande déjà annulée (rattrapé seulement par detectCancelledOrderRace
			// + auto-refund). Sans ce correctif, ces commandes restaient PENDING
			// indéfiniment au-delà de la fenêtre de poll.
			if (status === "requires_action" || status === "requires_confirmation") {
				try {
					await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
				} catch (cancelError) {
					// Race : le PI a pu passer `succeeded` entre le retrieve et le cancel.
					const fresh = await stripe.paymentIntents.retrieve(
						order.stripePaymentIntentId,
						undefined,
						{
							timeout: STRIPE_TIMEOUT_MS,
						},
					);
					if (fresh.status === "succeeded") {
						logger.info("PI succeeded during cancel race — processing as paid", {
							cronJob: "sync-async-payments",
							orderNumber: order.orderNumber,
						});
						await processPaidOrder(order.id, fresh, order.userId);
						updated++;
						continue;
					}
					logger.error("Failed to cancel stale PI — order kept PENDING for next run", cancelError, {
						cronJob: "sync-async-payments",
						orderNumber: order.orderNumber,
						orderId: order.id,
					});
					errors++;
					continue;
				}
			}

			if (
				status === "canceled" ||
				status === "requires_payment_method" ||
				status === "requires_action" ||
				status === "requires_confirmation"
			) {
				logger.info("Order payment failed/abandoned", {
					cronJob: "sync-async-payments",
					orderNumber: order.orderNumber,
					stripeStatus: status,
				});
				const result = await failOrder(order.id, order.stripePaymentIntentId, paymentIntent);
				if (!result.ok) {
					logger.error("Stock restore failed — order kept PENDING for next run", undefined, {
						cronJob: "sync-async-payments",
						orderNumber: order.orderNumber,
						orderId: order.id,
					});
					stockRestoreFailures.push({
						orderId: order.id,
						orderNumber: order.orderNumber,
						error: result.error,
					});
					errors++;
					continue;
				}
				for (const skuId of result.restoredSkuIds) {
					tagsToInvalidate.add(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
				}
				// CACHE-AUDIT-004 : tags user-scopés + détail commande.
				for (const tag of getOrderInvalidationTags(order.userId ?? undefined, order.id)) {
					tagsToInvalidate.add(tag);
				}
				// P2-1 : notifier le client (paiement non finalisé / 3DS abandonné).
				// Best-effort — un échec d'email ne doit jamais faire échouer le cron ni
				// re-PENDING la commande (déjà FAILED + stock restauré). idempotencyKey
				// identique à celle du webhook handlePaymentFailure ⇒ Resend dédoublonne
				// (24h) si les deux chemins se déclenchent pour la même commande.
				if (order.customerEmail) {
					try {
						await sendPaymentFailedEmail({
							to: order.customerEmail,
							customerName: order.customerName,
							orderNumber: order.orderNumber,
							retryUrl: `${getBaseUrl()}${ROUTES.SHOP.CHECKOUT}`,
							idempotencyKey: `payment-failed-${order.id}`,
						});
					} catch (emailError) {
						logger.error("Failed to send payment-failed email", emailError, {
							cronJob: "sync-async-payments",
							orderNumber: order.orderNumber,
							orderId: order.id,
						});
					}
				}
				updated++;
				continue;
			}
			// Autres statuts (`processing`) : paiement réellement en cours côté
			// banque → laissé PENDING, repris au prochain run.
		} catch (error) {
			logger.error("Error checking order", error, {
				cronJob: "sync-async-payments",
				orderNumber: order.orderNumber,
			});
			errors++;
		}
	}

	// Invalidate caches if any orders were updated
	if (updated > 0) {
		tagsToInvalidate.add(ORDERS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_BADGES);
		for (const tag of tagsToInvalidate) {
			updateTag(tag);
		}
	}

	// Emit a single aggregated alert for all stock-restore failures (avoid per-order inbox spam)
	if (stockRestoreFailures.length > 0) {
		sendAdminCronFailedAlert({
			job: "sync-async-payments",
			errors: stockRestoreFailures.length,
			details: {
				issue: "stock-restore-failed",
				failures: stockRestoreFailures,
			},
		}).catch((e) =>
			logger.error("Failed to send stock restore alert", e, {
				cronJob: "sync-async-payments",
			}),
		);
	}

	logger.info("Sync completed", { cronJob: "sync-async-payments", updated, errors });

	return {
		processed: updated,
		errored: errors,
		skipped: Math.max(0, pendingOrders.length - updated - errors),
		checked: pendingOrders.length,
		updated,
		errors,
		hasMore: pendingOrders.length === BATCH_SIZE_MEDIUM,
	};
}
