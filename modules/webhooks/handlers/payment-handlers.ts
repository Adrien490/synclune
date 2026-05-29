import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import {
	extractPaymentFailureDetails,
	restoreStockForOrder,
	markOrderAsFailed,
	markOrderAsCancelled,
	initiateAutomaticRefund,
	sendRefundFailureAlert,
} from "../services/payment-intent.service";
import { sendAdminOrderProcessingFailedAlert } from "@/modules/emails/services/admin-emails";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { buildUrl, getBaseUrl, ROUTES } from "@/shared/constants/urls";
import type { PostWebhookTask, WebhookHandlerResult } from "../types/webhook.types";
import {
	processOrderFromPaymentIntent,
	buildPostCheckoutTasksFromPI,
} from "../services/checkout.service";
import {
	OversellError,
	CancelledOrderRaceError,
} from "../services/checkout-order-processing.service";
import { captureWebhookError } from "../utils/capture-webhook-error";
import { ensureInvoiceNumberPersisted } from "@/modules/orders/services/ensure-invoice-number.service";
import { recordSalesEReporting } from "@/modules/invoices/services/record-ereporting.service";
import { extractPaymentMethodFromPaymentIntent } from "@/modules/payments/services/map-stripe-payment-method";

/**
 * Resolves orderId from PI metadata.
 * Supports both new flow (camelCase `orderId`) and old flow (snake_case `order_id`).
 */
function resolveOrderId(metadata: Stripe.Metadata): string | undefined {
	return metadata.orderId ?? metadata.order_id;
}

/**
 * Handles successful payment via Payment Intent.
 *
 * ORD-STRIPE-002 (2026-05-28) — unifié : on emprunte toujours
 * `processOrderFromPaymentIntent` (qui décrémente le stock + clear cart + désactive
 * SKU épuisés). L'ancien chemin "old CS flow" appelait `markOrderAsPaid` seul,
 * qui omettait le décrément stock — bug latent si `payment_intent.succeeded`
 * arrivait avant `checkout.session.completed` (l'ordre des webhooks Stripe
 * n'est pas garanti). `processOrderFromPaymentIntent` est idempotent via le
 * guard `paymentStatus === "PAID"` (checkout-order-processing.service.ts:114).
 */
export async function handlePaymentSuccess(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	let orderId = resolveOrderId(paymentIntent.metadata);

	// ORD-STRIPE-005 : si Stripe émet `payment_intent.succeeded` avant que
	// `confirmCheckout` step 9 ait pu poser `metadata.orderId` (paiement
	// instantané sans 3DS), on retrouve l'order via la clé unique
	// `stripePaymentIntentId` posée en step 8 (order-creation transaction).
	// Sans ce fallback, l'order reste PENDING et n'est rattrapée que ~1h
	// plus tard par le cron `sync-async-payments`.
	if (!orderId) {
		const fallbackOrder = await prisma.order.findFirst({
			where: { stripePaymentIntentId: paymentIntent.id, ...notDeleted },
			select: { id: true },
		});
		if (fallbackOrder) {
			orderId = fallbackOrder.id;
			logger.info(
				`⚠️ [WEBHOOK] payment_intent.succeeded missing metadata.orderId — resolved via stripePaymentIntentId fallback`,
				{ service: "webhook", orderId, paymentIntentId: paymentIntent.id },
			);
		} else {
			logger.warn(
				`⚠️ [WEBHOOK] payment_intent.succeeded without orderId in metadata (PI: ${paymentIntent.id})`,
				{ service: "webhook" },
			);
			return { success: true, skipped: true, reason: "no_order_id" };
		}
	}

	// Extraction du type de paiement effectif depuis Stripe (EINV-EREPORT-001).
	// Best-effort (null si Stripe API échoue) — ne bloque pas le flow paiement.
	const paymentMethod = (await extractPaymentMethodFromPaymentIntent(paymentIntent)) ?? undefined;

	try {
		const order = await processOrderFromPaymentIntent(orderId, paymentIntent, paymentMethod);

		// Audit F2 (2026-05-29) : sur-facturation détectée APRÈS traitement réussi.
		// `processOrderAtomically` honore la commande (le client a payé) mais ne
		// rembourse PAS le delta automatiquement — un refund auto créerait une
		// transaction REFUND e-reporting fantôme (Invariant 9 CLAUDE.md) divergente
		// de la DGFiP. On émet donc une alerte admin ACTIONNABLE (PI + delta) pour
		// refund manuel + ajustement e-reporting. Best-effort, ne bloque pas le flow.
		if (paymentIntent.amount_received > order.total) {
			const delta = paymentIntent.amount_received - order.total;
			logger.error(
				`⚠️ [WEBHOOK] Overbilling on order ${order.orderNumber}: captured ${paymentIntent.amount_received} > total ${order.total} (delta ${delta})`,
				undefined,
				{ service: "webhook" },
			);
			try {
				await sendAdminOrderProcessingFailedAlert({
					orderNumber: order.orderNumber,
					customerEmail: order.customerEmail ?? "Email non disponible",
					total: order.total,
					errorMessage: `Sur-facturation : Stripe a encaissé ${(paymentIntent.amount_received / 100).toFixed(2)}€ pour une commande à ${(order.total / 100).toFixed(2)}€ (delta ${(delta / 100).toFixed(2)}€). Action requise : remboursement manuel du delta + ajustement e-reporting (PAS d'avoir automatique).`,
					paymentIntentId: paymentIntent.id,
				});
			} catch (alertError) {
				logger.error("Failed to send overbilling admin alert", alertError, {
					service: "webhook",
				});
			}
		}

		// Génération facture eager (Art. 289-I CGI, ORD-COMPLY-002).
		await ensureInvoiceNumberPersisted(orderId);
		// E-reporting B2C (Phase 4 wiring, EINV-AUDIT-004). Best-effort,
		// feature-flagged via INVOICE_ENABLE_EREPORTING — fail-closed quand
		// la transmission DGFiP n'est pas encore configurée.
		await recordSalesEReporting(orderId);
		const tasks = buildPostCheckoutTasksFromPI(order, paymentIntent);
		return { success: true, tasks };
	} catch (error) {
		// ORD-STRIPE-009 : oversell (perdant d'une race sur le dernier exemplaire).
		// Le paiement est encaissé mais le stock est indisponible — un retry Stripe
		// ne résoudra rien (le stock ne reviendra pas). On rembourse automatiquement,
		// on marque la commande FAILED (ce qui libère aussi le code promo attaché,
		// cf. drift usageCount) et on renvoie 200 pour stopper les retries.
		if (error instanceof OversellError) {
			return handleOversell(orderId, paymentIntent);
		}
		// ORD-STRIPE-009 : paiement tardif sur commande déjà annulée (admin/cron).
		// `detectCancelledOrderRace` a déjà initié l'auto-refund idempotent avant de
		// throw — renvoyer SKIPPED (200) au lieu de rethrow évite un 500-retry-loop
		// Stripe (le refund ne sera jamais "réussi" du point de vue du traitement order).
		if (error instanceof CancelledOrderRaceError) {
			logger.warn(
				`⚠️ [WEBHOOK] PI succeeded on cancelled order ${orderId} — refund already initiated`,
				{
					service: "webhook",
					paymentIntentId: paymentIntent.id,
				},
			);
			return { success: true, skipped: true, reason: "cancelled_order_race" };
		}
		logger.error(`❌ [WEBHOOK] Error processing PI flow for order ${orderId}:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handlePaymentSuccess",
			eventType: "payment_intent.succeeded",
			orderId,
			paymentIntentId: paymentIntent.id,
		});
		// Send immediate admin alert — payment was received but order processing failed
		try {
			const order = await prisma.order.findFirst({
				where: { id: orderId },
				select: { orderNumber: true, customerEmail: true, total: true },
			});
			if (order) {
				await sendAdminOrderProcessingFailedAlert({
					orderNumber: order.orderNumber,
					customerEmail: order.customerEmail,
					total: order.total,
					errorMessage: error instanceof Error ? error.message : String(error),
					paymentIntentId: paymentIntent.id,
				});
			}
		} catch (alertError) {
			logger.error("Failed to send order processing failed alert", alertError, {
				service: "webhook",
			});
		}
		throw error;
	}
}

/**
 * ORD-STRIPE-009 — oversell remediation.
 *
 * Le perdant d'une race sur le dernier exemplaire : le paiement Stripe est
 * encaissé mais la re-validation FOR UPDATE au webhook a trouvé le stock
 * indisponible (`OversellError`), AVANT tout décrément → rien à restaurer côté
 * loser. On :
 *   1. marque la commande FAILED (idempotent) — ce qui libère aussi le code promo
 *      attaché (`releaseOrderDiscountUsageTx`), sinon `usageCount` dérive sur une
 *      commande fantôme jamais servie ;
 *   2. déclenche un remboursement automatique Stripe (idempotent via clé
 *      `auto-refund-${paymentIntentId}`) ;
 *   3. alerte l'admin + invalide les caches order ;
 *   4. renvoie 200 (success) pour stopper les retries Stripe — le stock ne
 *      reviendra pas, retry inutile.
 */
async function handleOversell(
	orderId: string,
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	logger.warn(`⚠️ [WEBHOOK] Oversell detected for order ${orderId} — auto-refunding`, {
		service: "webhook",
		paymentIntentId: paymentIntent.id,
	});

	const order = await prisma.order.findFirst({
		where: { id: orderId, ...notDeleted },
		select: { orderNumber: true, customerEmail: true, total: true, userId: true },
	});

	// 1. Marquer FAILED (libère le discount). Idempotent.
	await markOrderAsFailed(orderId, paymentIntent.id, {
		code: "oversell",
		declineCode: null,
		message: "Stock indisponible au moment de l'encaissement — remboursement automatique",
	});

	// 2. Remboursement automatique (idempotent).
	const refundResult = await initiateAutomaticRefund(
		paymentIntent.id,
		orderId,
		"Oversell — stock indisponible au webhook",
	);
	if (!refundResult.success && refundResult.error) {
		await sendRefundFailureAlert(orderId, paymentIntent.id, "other", refundResult.error.message);
	}

	// 3. Alerte admin (visibilité même si le refund a réussi : incident métier).
	if (order) {
		await sendAdminOrderProcessingFailedAlert({
			orderNumber: order.orderNumber,
			customerEmail: order.customerEmail,
			total: order.total,
			errorMessage: `Oversell : stock indisponible à l'encaissement. Remboursement automatique ${
				refundResult.success ? "initié" : "ÉCHOUÉ — intervention manuelle requise"
			}.`,
			paymentIntentId: paymentIntent.id,
		});
	}

	// 4. Invalidation cache (la commande passe CANCELLED côté espace client).
	const cacheTags = [...getOrderInvalidationTags(order?.userId ?? undefined, orderId)];
	return { success: true, tasks: [{ type: "INVALIDATE_CACHE", tags: cacheTags }] };
}

/**
 * Handles `payment_intent.processing` — le paiement est accepté mais le
 * règlement bancaire est en cours (rare en card-only capture automatique ;
 * certaines cartes/3DS transitent par cet état).
 *
 * F3 (2026-05-29) : on souscrit explicitement l'événement pour la traçabilité
 * (avant, il tombait dans le `SKIPPED` générique « unsupported event »). On NE
 * mute PAS `paymentStatus` : la commande reste PENDING jusqu'à l'événement
 * terminal `payment_intent.succeeded` (→ PAID) ou `payment_intent.payment_failed`
 * (→ FAILED) qui pilotent la transition. `sync-async-payments` laisse également
 * les PI `processing` en PENDING (repris au run suivant). Retour `skipped` avec
 * raison explicite — aucune tâche post-webhook.
 */
export async function handlePaymentProcessing(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	const orderId = resolveOrderId(paymentIntent.metadata);
	logger.info(`⏳ [WEBHOOK] Payment processing (bank settlement in progress)`, {
		service: "webhook",
		orderId,
		paymentIntentId: paymentIntent.id,
	});
	return { success: true, skipped: true, reason: "payment_processing" };
}

/**
 * Handles payment failure.
 * Restores reserved stock and initiates automatic refund if necessary.
 */
export async function handlePaymentFailure(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	const orderId = resolveOrderId(paymentIntent.metadata);

	if (!orderId) {
		// PI failed before confirmCheckout added orderId to metadata (e.g. user abandoned).
		// No order was created, so nothing to restore or refund — skip gracefully.
		logger.warn(
			`⚠️ [WEBHOOK] payment_intent.payment_failed without orderId in metadata (PI: ${paymentIntent.id})`,
			{ service: "webhook" },
		);
		return { success: true, skipped: true, reason: "no_order_id" };
	}

	try {
		// 1. Extract failure details
		const failureDetails = extractPaymentFailureDetails(paymentIntent);

		logger.info(`[AUDIT] Payment failure detected`, {
			service: "webhook",
			orderId,
			failureCode: failureDetails.code,
		});

		// 2. Restore stock if necessary
		const { restoredSkuIds, userId } = await restoreStockForOrder(orderId);

		// 3. Mark order as failed
		await markOrderAsFailed(orderId, paymentIntent.id, failureDetails);

		// 4. Automatic refund if money was captured
		if (paymentIntent.amount_received > 0) {
			logger.info(
				`💰 [WEBHOOK] Initiating automatic refund for order ${orderId} (${paymentIntent.amount_received} cents captured)`,
				{ service: "webhook" },
			);

			const refundResult = await initiateAutomaticRefund(
				paymentIntent.id,
				orderId,
				"Payment failed, automatic refund",
			);

			if (!refundResult.success && refundResult.error) {
				await sendRefundFailureAlert(
					orderId,
					paymentIntent.id,
					"payment_failed",
					refundResult.error.message,
				);
			}
		}

		logger.info(`❌ [WEBHOOK] Order ${orderId} payment failed`, { service: "webhook" });

		// 5. Build cache invalidation tasks
		// CACHE-AUDIT-002 : passe par le helper canonique pour couvrir les tags
		// user-scopés (USER_ORDERS, LAST_ORDER, ACCOUNT_STATS) et le détail
		// (DETAIL/CONFIRMATION/HISTORY) — sinon l'espace client affiche encore
		// la commande en PENDING/PROCESSING jusqu'à l'expiration du profil `user`.
		const cacheTags: string[] = [...getOrderInvalidationTags(userId ?? undefined, orderId)];
		for (const skuId of restoredSkuIds) {
			cacheTags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
		}

		const tasks: PostWebhookTask[] = [{ type: "INVALIDATE_CACHE", tags: cacheTags }];

		// 6. BIZ-BUG-004 : notifier le client de l'échec, à parité avec le flux
		// async (handleAsyncPaymentFailed). Sur un refus carte synchrone l'erreur
		// remonte déjà dans l'UI, mais `payment_intent.payment_failed` peut aussi
		// survenir en différé (client absent) — l'email reste utile et l'idempotency
		// key Resend protège du doublon.
		const failedOrder = await prisma.order.findFirst({
			where: { id: orderId, ...notDeleted },
			select: { orderNumber: true, customerEmail: true, customerName: true },
		});
		if (failedOrder?.customerEmail) {
			tasks.push({
				type: "PAYMENT_FAILED_EMAIL",
				data: {
					to: failedOrder.customerEmail,
					customerName: failedOrder.customerName,
					orderNumber: failedOrder.orderNumber,
					retryUrl: `${getBaseUrl()}${ROUTES.SHOP.CHECKOUT}`,
					// dedup cross-instance Resend 24h sur retries (cf. ORD-STRIPE-008).
					idempotencyKey: `payment-failed-${orderId}`,
				},
			});
		}

		return { success: true, tasks };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling payment failure for order ${orderId}:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handlePaymentFailure",
			eventType: "payment_intent.payment_failed",
			orderId,
			paymentIntentId: paymentIntent.id,
		});
		throw error;
	}
}

/**
 * Handles payment cancellation.
 * Cancels the order and initiates automatic refund if necessary.
 */
export async function handlePaymentCanceled(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	const orderId = resolveOrderId(paymentIntent.metadata);

	if (!orderId) {
		// PI canceled before confirmCheckout added orderId to metadata (e.g. user abandoned).
		// No order was created, so nothing to restore or refund — skip gracefully.
		logger.warn(
			`⚠️ [WEBHOOK] payment_intent.canceled without orderId in metadata (PI: ${paymentIntent.id})`,
			{ service: "webhook" },
		);
		return { success: true, skipped: true, reason: "no_order_id" };
	}

	try {
		// 1. Restore stock if it was decremented (order was PROCESSING/PAID)
		const { restoredSkuIds, userId } = await restoreStockForOrder(orderId);

		// 2. Mark order as cancelled
		await markOrderAsCancelled(orderId, paymentIntent.id);

		// 3. Automatic refund if payment was captured
		if (paymentIntent.status === "canceled" && paymentIntent.amount_received > 0) {
			logger.info(`💰 [WEBHOOK] Initiating automatic refund for canceled order ${orderId}`, {
				service: "webhook",
			});

			const refundResult = await initiateAutomaticRefund(
				paymentIntent.id,
				orderId,
				"Payment canceled, automatic refund",
			);

			if (!refundResult.success && refundResult.error) {
				await sendRefundFailureAlert(
					orderId,
					paymentIntent.id,
					"payment_canceled",
					refundResult.error.message,
				);
			}
		}

		logger.info(`⚠️ [WEBHOOK] Order ${orderId} payment canceled`, { service: "webhook" });

		// 4. Build cache invalidation tasks
		// CACHE-AUDIT-002 : helper canonique (cf. handlePaymentFailure).
		const cacheTags: string[] = [...getOrderInvalidationTags(userId ?? undefined, orderId)];
		for (const skuId of restoredSkuIds) {
			cacheTags.push(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
		}

		return {
			success: true,
			tasks: [
				{
					type: "INVALIDATE_CACHE",
					tags: cacheTags,
				},
			],
		};
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling payment cancelation for order ${orderId}:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handlePaymentCanceled",
			eventType: "payment_intent.canceled",
			orderId,
			paymentIntentId: paymentIntent.id,
		});
		throw error;
	}
}

/**
 * Handles invoice payment failure
 *
 * When invoice_creation.enabled is true in checkout, Stripe creates invoices.
 * If a payment retry on those invoices fails, this handler sends an admin alert.
 */
export async function handleInvoicePaymentFailed(
	invoice: Stripe.Invoice,
): Promise<WebhookHandlerResult> {
	const orderId = invoice.metadata?.orderId;

	try {
		// Try to find the related order via invoice metadata or customer email
		const order = orderId
			? await prisma.order.findFirst({
					where: { id: orderId, ...notDeleted },
					select: {
						id: true,
						orderNumber: true,
						customerEmail: true,
						stripePaymentIntentId: true,
					},
				})
			: null;

		const orderNumber = order?.orderNumber ?? invoice.number ?? "N/A";
		const customerEmail = order?.customerEmail ?? invoice.customer_email ?? "N/A";
		const amount = invoice.amount_due || 0;

		// Extract error message from the invoice
		const errorMessage =
			invoice.last_finalization_error?.message ??
			`Invoice payment failed (status: ${invoice.status})`;

		const dashboardUrl = order
			? buildUrl(ROUTES.ADMIN.ORDER_DETAIL(order.id))
			: buildUrl(ROUTES.ADMIN.ORDERS);

		logger.info(`❌ [WEBHOOK] Invoice payment failed for order ${orderNumber} (${amount} cents)`, {
			service: "webhook",
		});

		return {
			success: true,
			tasks: [
				{
					type: "ADMIN_INVOICE_FAILED_ALERT",
					data: {
						orderNumber,
						customerEmail,
						amount,
						errorMessage,
						stripePaymentIntentId: order?.stripePaymentIntentId ?? undefined,
						dashboardUrl,
					},
				},
				{
					type: "INVALIDATE_CACHE",
					tags: [
						ORDERS_CACHE_TAGS.LIST,
						SHARED_CACHE_TAGS.ADMIN_BADGES,
						SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
					],
				},
			],
		};
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling invoice.payment_failed:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handleInvoicePaymentFailed",
			eventType: "invoice.payment_failed",
			orderId,
		});
		throw error;
	}
}
