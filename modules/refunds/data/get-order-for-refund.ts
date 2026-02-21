import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { GET_ORDER_FOR_REFUND_SELECT } from "../constants/refund.constants";
import { getOrderForRefundSchema } from "../schemas/refund.schemas";
import type {
	GetOrderForRefundParams,
	OrderForRefund,
} from "../types/refund.types";

// Re-export for backward compatibility
export { getOrderForRefundSchema };
export type { GetOrderForRefundParams, OrderForRefund, OrderItemForRefund } from "../types/refund.types";

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

	return fetchOrderForRefund(validation.data.orderId);
}

/**
 * Récupère la commande depuis la DB (avec cache)
 */
async function fetchOrderForRefund(
	orderId: string
): Promise<OrderForRefund | null> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	try {
		// Exclure les commandes soft-deleted
		const order = await prisma.order.findUnique({
			where: { id: orderId, ...notDeleted },
			select: GET_ORDER_FOR_REFUND_SELECT,
		});

		return order;
	} catch (error) {
		console.error("[GET_ORDER_FOR_REFUND]", error);
		return null;
	}
}
