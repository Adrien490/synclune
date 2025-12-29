import { isAdmin } from "@/modules/auth/utils/guards";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { prisma } from "@/shared/lib/prisma";
import { cacheOrdersDashboard } from "../constants/cache";
import { z } from "zod";
import { GET_ORDER_SELECT } from "../constants/order.constants";
import type { GetOrderReturn } from "../types/order.types";
import { getOrderByIdSchema } from "../schemas/order.schemas";

// Re-export for backward compatibility
export { getOrderByIdSchema };

export type GetOrderByIdParams = z.infer<typeof getOrderByIdSchema>;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère une commande par son ID
 * Réservé aux administrateurs
 */
export async function getOrderById(
	params: Partial<GetOrderByIdParams>
): Promise<GetOrderReturn | null> {
	const validation = getOrderByIdSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();

	if (!admin) {
		return null;
	}

	return fetchOrderById(validation.data.id);
}

// ============================================================================
// FETCH FUNCTION (CACHED)
// ============================================================================

async function fetchOrderById(id: string): Promise<GetOrderReturn | null> {
	"use cache";
	cacheOrdersDashboard(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);

	try {
		const order = await prisma.order.findUnique({
			where: { id },
			select: GET_ORDER_SELECT,
		});

		return order;
	} catch (error) {
		if (process.env.NODE_ENV !== "production") {
			console.error("fetchOrderById error:", error);
		}
		return null;
	}
}
