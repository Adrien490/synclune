import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";

// Re-export pour conserver l'API publique du module webhooks.
export { createOrderFromCheckoutSession } from "./checkout-order-processing.service";

// Re-export post-checkout task builders
export { buildPostCheckoutTasks } from "./checkout-post-tasks.service";

/**
 * Rapatrie une Session Stripe avec les expansions nécessaires à la création de
 * l'`Order` Synclune (line_items, shipping, payment_intent, customer).
 */
export async function retrieveCheckoutSessionForOrder(
	sessionId: string,
): Promise<Stripe.Checkout.Session> {
	return stripe.checkout.sessions.retrieve(sessionId, {
		expand: [
			"line_items",
			"line_items.data.price.product",
			"payment_intent",
			"customer",
			"shipping_cost.shipping_rate",
			"total_details.breakdown.discounts",
		],
	});
}

/**
 * Marque la Session comme « expirée sans Order ». Utilisé par le webhook
 * `checkout.session.expired` lorsque le client a abandonné.
 *
 * Avant la migration vers Checkout Sessions API, un Order PENDING_PAYMENT était
 * créé en amont et il fallait le passer à CANCELLED. Désormais l'Order n'est
 * créé qu'au paiement réussi, donc cette fonction n'a quasiment rien à faire ;
 * elle reste pour les Orders rétrocompatibles encore associés à une Session.
 */
export async function cancelExpiredOrder(
	sessionId: string,
): Promise<{ cancelled: boolean; orderNumber?: string }> {
	const order = await prisma.order.findUnique({
		where: { stripeCheckoutSessionId: sessionId },
		select: { id: true, orderNumber: true, paymentStatus: true },
	});

	if (!order) {
		logger.info(
			`ℹ️  [WEBHOOK] No Order linked to expired session ${sessionId} (expected for new flow)`,
			{ service: "webhook" },
		);
		return { cancelled: false };
	}

	if (order.paymentStatus !== "PENDING") {
		logger.info(
			`ℹ️  [WEBHOOK] Order ${order.id} for expired session ${sessionId} already ${order.paymentStatus}, skipping`,
			{ service: "webhook" },
		);
		return { cancelled: false, orderNumber: order.orderNumber };
	}

	await prisma.$transaction(async (tx) => {
		const discountUsages = await tx.discountUsage.findMany({
			where: { orderId: order.id },
			select: { id: true, discountId: true },
		});
		for (const usage of discountUsages) {
			await tx.discount.update({
				where: { id: usage.discountId },
				data: { usageCount: { decrement: 1 } },
			});
		}
		if (discountUsages.length > 0) {
			await tx.discountUsage.deleteMany({ where: { orderId: order.id } });
		}
		await tx.order.update({
			where: { id: order.id },
			data: { status: "CANCELLED", paymentStatus: "EXPIRED" },
		});
	});

	return { cancelled: true, orderNumber: order.orderNumber };
}
