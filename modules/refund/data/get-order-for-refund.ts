import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SCHEMA
// ============================================================================

export const getOrderForRefundSchema = z.object({
	orderId: z.cuid2(),
});

// ============================================================================
// SELECT
// ============================================================================

export const GET_ORDER_FOR_REFUND_SELECT = {
	id: true,
	orderNumber: true,
	customerEmail: true,
	customerName: true,
	total: true,
	paymentStatus: true,
	stripePaymentIntentId: true,
	stripeChargeId: true,
	items: {
		select: {
			id: true,
			productTitle: true,
			productImageUrl: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			skuImageUrl: true,
			price: true,
			quantity: true,
			skuId: true,
			refundItems: {
				where: {
					refund: {
						status: {
							in: ["PENDING", "APPROVED", "COMPLETED"],
						},
					},
				},
				select: {
					quantity: true,
				},
			},
		},
	},
	refunds: {
		where: {
			status: "COMPLETED",
		},
		select: {
			amount: true,
		},
	},
} as const satisfies Prisma.OrderSelect;

// ============================================================================
// TYPES
// ============================================================================

export type GetOrderForRefundParams = z.infer<typeof getOrderForRefundSchema>;

export type OrderForRefund = Prisma.OrderGetPayload<{
	select: typeof GET_ORDER_FOR_REFUND_SELECT;
}>;

export type OrderItemForRefund = OrderForRefund["items"][0];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère une commande avec les infos nécessaires pour créer un remboursement
 * Inclut les quantités déjà remboursées par article
 */
export async function getOrderForRefund(
	params: Partial<GetOrderForRefundParams>
): Promise<OrderForRefund | null> {
	const validation = getOrderForRefundSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();

	if (!admin) {
		return null;
	}

	try {
		const order = await prisma.order.findUnique({
			where: { id: validation.data.orderId },
			select: GET_ORDER_FOR_REFUND_SELECT,
		});

		return order;
	} catch (error) {
		console.error("getOrderForRefund error:", error);
		return null;
	}
}
