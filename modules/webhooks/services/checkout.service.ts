import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";
import { getShippingRateName } from "@/modules/orders/constants/stripe-shipping-rates";

// Re-export order processing functions (public API preserved)
export {
	processOrderTransaction,
	processOrderFromPaymentIntent,
} from "./checkout-order-processing.service";

// Re-export post-checkout task builders (public API preserved)
export {
	buildPostCheckoutTasks,
	buildPostCheckoutTasksFromPI,
} from "./checkout-post-tasks.service";

/**
 * Extracts shipping info from a Stripe Checkout Session.
 */
export async function extractShippingInfo(
	session: Stripe.Checkout.Session,
): Promise<{ shippingCost: number; shippingMethod: string; shippingRateId: string | undefined }> {
	try {
		const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
			expand: ["shipping_cost.shipping_rate"],
		});

		const shippingCost = fullSession.total_details?.amount_shipping ?? 0;
		const shippingRateId =
			typeof fullSession.shipping_cost?.shipping_rate === "string"
				? fullSession.shipping_cost.shipping_rate
				: fullSession.shipping_cost?.shipping_rate?.id;

		const shippingMethod = shippingRateId
			? getShippingRateName(shippingRateId)
			: "Livraison standard";

		return { shippingCost, shippingMethod, shippingRateId };
	} catch (error) {
		logger.error(
			`❌ [WEBHOOK] Failed to retrieve shipping info for session ${session.id}:`,
			error,
			{ service: "webhook" },
		);
		// Fallback to session-level data if Stripe API fails
		const shippingCost = session.total_details?.amount_shipping ?? 0;
		return { shippingCost, shippingMethod: "Livraison standard", shippingRateId: undefined };
	}
}

/**
 * Marks an order as expired/cancelled.
 */
export async function cancelExpiredOrder(
	orderId: string,
): Promise<{ cancelled: boolean; orderNumber?: string }> {
	const result = await prisma.$transaction(
		async (tx) => {
			const order = await tx.order.findUnique({
				where: { id: orderId },
				select: { paymentStatus: true, orderNumber: true },
			});

			if (!order) {
				logger.warn(`⚠️  [WEBHOOK] Order not found for expired session: ${orderId}`, {
					service: "webhook",
				});
				return { cancelled: false } as const;
			}

			// Idempotence: only process if the order is still PENDING
			if (order.paymentStatus !== "PENDING") {
				logger.info(
					`ℹ️  [WEBHOOK] Order ${orderId} already processed (status: ${order.paymentStatus}), skipping expiration`,
					{ service: "webhook" },
				);
				return { cancelled: false, orderNumber: order.orderNumber } as const;
			}

			// Release discount usages
			const discountUsages = await tx.discountUsage.findMany({
				where: { orderId },
				select: { id: true, discountId: true },
			});

			for (const usage of discountUsages) {
				await tx.discount.update({
					where: { id: usage.discountId },
					data: { usageCount: { decrement: 1 } },
				});
			}

			if (discountUsages.length > 0) {
				await tx.discountUsage.deleteMany({ where: { orderId } });
				logger.info(
					`🔓 [WEBHOOK] Released ${discountUsages.length} discount usage(s) for expired order ${orderId}`,
					{ service: "webhook" },
				);
			}

			await tx.order.update({
				where: { id: orderId },
				data: {
					status: "CANCELLED",
					paymentStatus: "EXPIRED",
				},
			});

			logger.info(
				`✅ [WEBHOOK] Order ${orderId} (${order.orderNumber}) marked as cancelled due to session expiration`,
				{ service: "webhook" },
			);
			return { cancelled: true, orderNumber: order.orderNumber } as const;
		},
		{ timeout: 10000 },
	);

	return result;
}
