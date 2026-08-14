import { cacheLife, cacheTag } from "next/cache";
import { orderIdParamSchema } from "../schemas/order-route-params.schema";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import type { OrderRefundItem } from "../types/order-refunds.types";

// Re-export du type pour compatibilité
export type { OrderRefundItem } from "../types/order-refunds.types";

// SSOT partagée avec les route handlers commande — 3 fichiers `data/` en
// redéclaraient chacun une copie.
const orderIdSchema = orderIdParamSchema;

/**
 * Récupère les remboursements d'une commande (ADMIN)
 *
 * Le cache est géré dans fetchOrderRefunds() avec "use cache"
 */
export async function getOrderRefunds(
	orderId: string,
): Promise<{ refunds: OrderRefundItem[] } | { error: string }> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) {
			return { error: adminCheck.error.message };
		}

		// 2. Validate orderId
		const parsed = orderIdSchema.safeParse(orderId);
		if (!parsed.success) {
			return { error: "ID commande invalide" };
		}

		// 3. Récupérer les remboursements via fonction cachée
		const refunds = await fetchOrderRefunds(parsed.data);
		return { refunds };
	} catch (error) {
		logger.error("Failed to fetch order refunds", error, { service: "getOrderRefunds" });
		return { error: "Une erreur est survenue" };
	}
}

/**
 * Récupère les remboursements d'une commande depuis la DB avec "use cache"
 */
async function fetchOrderRefunds(orderId: string): Promise<OrderRefundItem[]> {
	"use cache";
	cacheLife("user");
	cacheTag(ORDERS_CACHE_TAGS.REFUNDS(orderId));

	return prisma.refund.findMany({
		where: { orderId },
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
