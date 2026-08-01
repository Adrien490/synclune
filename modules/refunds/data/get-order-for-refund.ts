import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { cacheLife, cacheTag } from "next/cache";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { GET_ORDER_FOR_REFUND_SELECT } from "../constants/refund.constants";
import { getOrderForRefundSchema } from "../schemas/refund.schemas";
import type { GetOrderForRefundParams, OrderForRefund } from "../types/refund.types";

// Re-export for backward compatibility
export type { OrderForRefund, OrderItemForRefund } from "../types/refund.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère une commande avec les infos nécessaires pour créer un remboursement
 * Inclut les quantités déjà remboursées par article
 */
export async function getOrderForRefund(
	params: Partial<GetOrderForRefundParams>,
): Promise<OrderForRefund | null> {
	const validation = getOrderForRefundSchema.safeParse(params);

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
async function fetchOrderForRefund(orderId: string): Promise<OrderForRefund | null> {
	"use cache";
	cacheLife("user");
	// `DETAIL(orderId)` en plus de `REFUNDS(orderId)` : ce fetcher lit
	// `status`/`paymentStatus`/`fulfillmentStatus` (GET_ORDER_FOR_REFUND_SELECT), et la page
	// qui le consomme s'en sert comme GARDE D'ACCÈS —
	// `app/admin/ventes/remboursements/nouveau/page.tsx` calcule `getOrderPermissions(order)`
	// dessus et redirige si `canRefund` est faux. Il dépend donc du même signal que
	// `get-order-by-id.ts`, qui pose déjà `DETAIL(id)`.
	//
	// `getOrderInvalidationTags()` ne contient PAS `REFUNDS(orderId)` (seuls cancel-order,
	// mark-as-fully-refunded et les actions refunds l'ajoutent) : sans `DETAIL`, un
	// `mark-as-paid` / `mark-as-shipped` / une transition webhook laissait cette entrée
	// périmée et le bouton « Rembourser » renvoyait l'admin sur le détail commande pendant
	// toute la fenêtre du profil `user`, alors que ce détail affichait déjà PAID.
	cacheTag(ORDERS_CACHE_TAGS.REFUNDS(orderId), ORDERS_CACHE_TAGS.DETAIL(orderId));

	try {
		// Exclure les commandes soft-deleted
		const order = await prisma.order.findUnique({
			where: { id: orderId, ...notDeleted },
			select: GET_ORDER_FOR_REFUND_SELECT,
		});

		return order;
	} catch (error) {
		logger.error("Failed to fetch order for refund", error, { orderId });
		return null;
	}
}
