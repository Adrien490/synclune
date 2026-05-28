import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import { type Prisma, type PaymentMethod } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import {
	getShippingMethodFromRate,
	getShippingCarrierFromRate,
} from "@/modules/orders/constants/stripe-shipping-rates";
import type { OrderWithItems } from "../types/checkout.types";
import { initiateAutomaticRefund } from "./payment-intent.service";

/**
 * ORD-BIZ-011 : custom error thrown when a `payment_intent.succeeded` webhook
 * arrives APRÈS que l'admin (ou un cron) a déjà annulé la commande. Le caller
 * (checkout.service.ts) catch et skip invoice/email chain — l'auto-refund est
 * déjà initié de manière idempotente.
 */
export class CancelledOrderRaceError extends Error {
	constructor(public readonly orderId: string) {
		super(`Order ${orderId} cancelled — auto-refund initié, paiement Stripe non finalisé`);
		this.name = "CancelledOrderRaceError";
	}
}

/**
 * ORD-BIZ-011 : détection pré-transaction d'un payment_intent.succeeded tardif
 * sur commande CANCELLED. Déclenche un auto-refund Stripe idempotent et throw
 * pour que le caller skip toute mutation/chain post-paiement.
 */
async function detectCancelledOrderRace(
	orderId: string,
	paymentIntentId: string,
	flowLabel: string,
): Promise<void> {
	const order = await prisma.order.findUnique({
		where: { id: orderId, ...notDeleted },
		select: { id: true, orderNumber: true, status: true },
	});
	if (!order || order.status !== "CANCELLED") return;

	logger.warn(
		`[WEBHOOK] Late payment_intent.succeeded for already-CANCELLED order ${orderId} (${flowLabel}) — auto-refunding`,
		{ service: "webhook", orderId, paymentIntentId },
	);

	Sentry.withScope((scope) => {
		scope.setLevel("warning");
		scope.setTag("payments", "cancel-vs-webhook-race");
		scope.setContext("order", { orderId, orderNumber: order.orderNumber });
		Sentry.captureMessage(
			`Late payment confirmation on cancelled order ${order.orderNumber} — auto-refund triggered`,
			"warning",
		);
	});

	await initiateAutomaticRefund(paymentIntentId, orderId, "cancelled-before-confirmation");
	throw new CancelledOrderRaceError(orderId);
}

/**
 * Maps a Prisma order to OrderWithItems.
 * Avoids dangerous type assertions (as unknown as).
 */
function mapToOrderWithItems(order: {
	id: string;
	orderNumber: string;
	userId: string | null;
	customerEmail: string | null;
	shippingFirstName: string | null;
	shippingLastName: string | null;
	shippingAddress1: string | null;
	shippingAddress2: string | null;
	shippingPostalCode: string | null;
	shippingCity: string | null;
	shippingCountry: string | null;
	shippingPhone: string | null;
	subtotal: number;
	discountAmount: number;
	shippingCost: number;
	taxAmount: number;
	total: number;
	items: Array<{
		productTitle: string | null;
		skuColor: string | null;
		skuMaterial: string | null;
		skuSize: string | null;
		quantity: number;
		price: number;
		skuId: string;
		sku: { id: string; inventory: number; sku: string } | null;
	}>;
}): OrderWithItems {
	return {
		id: order.id,
		orderNumber: order.orderNumber,
		userId: order.userId,
		customerEmail: order.customerEmail,
		shippingFirstName: order.shippingFirstName,
		shippingLastName: order.shippingLastName,
		shippingAddress1: order.shippingAddress1,
		shippingAddress2: order.shippingAddress2,
		shippingPostalCode: order.shippingPostalCode,
		shippingCity: order.shippingCity,
		shippingCountry: order.shippingCountry,
		shippingPhone: order.shippingPhone,
		subtotal: order.subtotal,
		discountAmount: order.discountAmount,
		shippingCost: order.shippingCost,
		taxAmount: order.taxAmount,
		total: order.total,
		items: order.items.map((item) => ({
			productTitle: item.productTitle,
			skuColor: item.skuColor,
			skuMaterial: item.skuMaterial,
			skuSize: item.skuSize,
			quantity: item.quantity,
			price: item.price,
			skuId: item.skuId,
			sku: item.sku,
		})),
	};
}

/**
 * Common order processing logic shared between CS and PI flows.
 * Validates stock, decrements inventory, deactivates out-of-stock SKUs, clears cart.
 * The caller provides flow-specific order update data and guest session ID.
 */
async function processOrderAtomically(
	tx: Prisma.TransactionClient,
	orderId: string,
	orderUpdateData: Prisma.OrderUpdateInput,
	guestSessionId: string | undefined,
	flowLabel: string,
	expectedAmountReceived?: number | null,
): Promise<OrderWithItems> {
	// 1. Fetch order with items and SKUs
	const order = await tx.order.findUnique({
		where: { id: orderId },
		include: {
			items: {
				include: {
					sku: {
						select: {
							id: true,
							inventory: true,
							sku: true,
						},
					},
				},
			},
			user: {
				select: { id: true },
			},
		},
	});

	if (!order) {
		throw new Error(`Order not found: ${orderId}`);
	}

	// 2. Idempotence check
	if (order.paymentStatus === "PAID") {
		logger.info(`⚠️  [WEBHOOK] Order ${orderId} already processed (${flowLabel}), skipping`, {
			service: "webhook",
		});
		return mapToOrderWithItems(order);
	}

	// 2b. Defense-in-depth: refuse to mark the order PAID if Stripe captured less
	// than the order total. Guards against any client-side underbilling regression
	// (audit P1.5 / P0.1, 2026-05-11).
	if (typeof expectedAmountReceived === "number" && expectedAmountReceived < order.total) {
		throw new Error(
			`Amount mismatch for order ${orderId} (${flowLabel}): Stripe received ${expectedAmountReceived} but order.total is ${order.total}`,
		);
	}

	// 3. Re-validate all items INSIDE the transaction to prevent race conditions
	logger.info(
		`[WEBHOOK] Re-validating ${order.items.length} items for order ${orderId} (${flowLabel})`,
		{ service: "webhook" },
	);

	const skuIds = order.items.map((item) => item.skuId);
	const skus = await tx.$queryRaw<
		Array<{
			id: string;
			inventory: number;
			isActive: boolean;
			deletedAt: Date | null;
			productStatus: string;
			productDeletedAt: Date | null;
		}>
	>`
		SELECT ps.id, ps.inventory, ps."isActive", ps."deletedAt",
		       p.status as "productStatus", p."deletedAt" as "productDeletedAt"
		FROM "ProductSku" ps
		INNER JOIN "Product" p ON ps."productId" = p.id
		WHERE ps.id = ANY(${skuIds}::text[])
		FOR UPDATE
	`;
	const skuMap = new Map(skus.map((s) => [s.id, s]));

	for (const item of order.items) {
		const sku = skuMap.get(item.skuId);
		const isValid =
			sku &&
			!sku.deletedAt &&
			!sku.productDeletedAt &&
			sku.isActive &&
			sku.productStatus === "PUBLIC" &&
			sku.inventory >= item.quantity;

		if (!isValid) {
			const reason = !sku
				? "SKU not found"
				: `invalid (active=${sku.isActive}, stock=${sku.inventory}, deleted=${!!sku.deletedAt})`;
			logger.error(
				`[WEBHOOK] Validation failed for order ${orderId}, SKU ${item.skuId}: ${reason}`,
				undefined,
				{ service: "webhook" },
			);
			throw new Error(
				`Invalid item in order: ${reason} (SKU: ${item.skuId}, Quantity: ${item.quantity})`,
			);
		}
	}

	logger.info(`[WEBHOOK] All items validated successfully for order ${orderId} (${flowLabel})`, {
		service: "webhook",
	});

	// 4. Decrement stock for each item
	for (const item of order.items) {
		await tx.productSku.update({
			where: { id: item.skuId },
			data: { inventory: { decrement: item.quantity } },
		});
	}

	logger.info(`✅ [WEBHOOK] Stock decremented for order ${orderId} (${flowLabel})`, {
		service: "webhook",
	});

	// 5. Update order with flow-specific data
	await tx.order.update({
		where: { id: orderId },
		data: orderUpdateData,
	});

	// 5b. Deactivate out-of-stock SKUs (single query instead of N+1)
	const { count: deactivatedCount } = await tx.productSku.updateMany({
		where: { id: { in: skuIds }, inventory: 0 },
		data: { isActive: false },
	});
	if (deactivatedCount > 0) {
		logger.info(
			`📦 [WEBHOOK] ${deactivatedCount} SKU(s) deactivated (out of stock) for order ${orderId} (${flowLabel})`,
			{ service: "webhook" },
		);
	}

	// 6. Clear cart after successful payment (logged-in OR guest)
	if (order.userId) {
		await tx.cartItem.deleteMany({
			where: { cart: { userId: order.userId } },
		});
		logger.info(
			`🧹 [WEBHOOK] Cart cleared for user ${order.userId} after successful payment (${flowLabel})`,
			{ service: "webhook" },
		);
	} else if (guestSessionId) {
		await tx.cartItem.deleteMany({
			where: { cart: { sessionId: guestSessionId } },
		});
		logger.info(
			`🧹 [WEBHOOK] Cart cleared for guest session ${guestSessionId} after successful payment (${flowLabel})`,
			{ service: "webhook" },
		);
	}

	logger.info(`✅ [WEBHOOK] Order processed successfully (${flowLabel}): ${order.orderNumber}`, {
		service: "webhook",
	});

	return mapToOrderWithItems(order);
}

/**
 * Processes order from a Checkout Session in an atomic transaction.
 */
export async function processOrderTransaction(
	orderId: string,
	session: Stripe.Checkout.Session,
	shippingCost: number,
	shippingRateId: string | undefined,
): Promise<OrderWithItems> {
	// ORD-BIZ-011 : pré-check CANCELLED hors transaction pour court-circuiter
	// avant FOR UPDATE + auto-refund le paiement tardif (throws CancelledOrderRaceError).
	await detectCancelledOrderRace(orderId, session.payment_intent as string, "CS flow");

	return prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			return processOrderAtomically(
				tx,
				orderId,
				{
					status: "PROCESSING",
					paymentStatus: "PAID",
					paidAt: new Date(),
					stripePaymentIntentId: session.payment_intent as string,
					stripeCheckoutSessionId: session.id,
					stripeCustomerId: (session.customer as string) || null,
					shippingCost,
					shippingMethod: getShippingMethodFromRate(shippingRateId ?? ""),
					shippingCarrier: getShippingCarrierFromRate(shippingRateId ?? ""),
				},
				session.metadata?.guestSessionId,
				"CS flow",
				session.amount_total,
			);
		},
		// ORD-STRIPE-004 : tx FOR UPDATE sur SKU + Order — sans maxWait override
		// le défaut Prisma (2s) génère P2024 sous contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);
}

/**
 * Processes order from a Payment Intent (new PI flow).
 * Shipping info is already stored in the Order (set during confirmCheckout).
 *
 * @param paymentMethod (optionnel) — type Stripe extrait via
 *   `extractPaymentMethodFromPaymentIntent`. Persisté sur Order.paymentMethod
 *   pour conformité e-reporting B2C (EINV-EREPORT-001). Si omis, la valeur
 *   par défaut Prisma (CARD) reste appliquée.
 */
export async function processOrderFromPaymentIntent(
	orderId: string,
	paymentIntent: Stripe.PaymentIntent,
	paymentMethod?: PaymentMethod,
): Promise<OrderWithItems> {
	// ORD-BIZ-011 : pré-check CANCELLED hors transaction (throws CancelledOrderRaceError).
	await detectCancelledOrderRace(orderId, paymentIntent.id, "PI flow");

	return prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			return processOrderAtomically(
				tx,
				orderId,
				{
					status: "PROCESSING",
					paymentStatus: "PAID",
					paidAt: new Date(),
					stripePaymentIntentId: paymentIntent.id,
					stripeCustomerId:
						typeof paymentIntent.customer === "string" ? paymentIntent.customer : null,
					...(paymentMethod !== undefined && { paymentMethod }),
				},
				paymentIntent.metadata.guestSessionId,
				"PI flow",
				paymentIntent.amount_received,
			);
		},
		// ORD-STRIPE-004 : tx FOR UPDATE sur SKU + Order — sans maxWait override
		// le défaut Prisma (2s) génère P2024 sous contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);
}
