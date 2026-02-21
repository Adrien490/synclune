import { cacheLife, cacheTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import type { OrderRefundItem } from "../types/order-refunds.types";

// Re-export du type pour compatibilité
export type { OrderRefundItem } from "../types/order-refunds.types";

/**
 * Récupère les remboursements d'une commande (ADMIN)
 *
 * Le cache est géré dans fetchOrderRefunds() avec "use cache"
 */
export async function getOrderRefunds(
	orderId: string
): Promise<{ refunds: OrderRefundItem[] } | { error: string }> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) {
			return { error: adminCheck.error.message };
		}

		// 2. Récupérer les remboursements via fonction cachée
		const refunds = await fetchOrderRefunds(orderId);
		return { refunds };
	} catch (error) {
		console.error("[GET_ORDER_REFUNDS] Erreur:", error);
		return { error: "Une erreur est survenue" };
	}
}

/**
 * Récupère les remboursements d'une commande depuis la DB avec "use cache"
 */
async function fetchOrderRefunds(orderId: string): Promise<OrderRefundItem[]> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(ORDERS_CACHE_TAGS.REFUNDS(orderId));

	return prisma.refund.findMany({
		where: {
			orderId,
			...notDeleted,
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			amount: true,
			status: true,
			reason: true,
			createdAt: true,
		},
	});
}
