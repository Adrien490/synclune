import { isAdmin } from "@/shared/lib/guards";
import { cacheDashboardOrders } from "@/modules/dashboard/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { z } from "zod";

import { GET_ORDER_SELECT } from "../constants/order.constants";
import type { GetOrderReturn } from "../types/order.types";

// ============================================================================
// SCHEMA
// ============================================================================

export const getOrderByIdSchema = z.object({
	id: z.cuid2(),
});

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
	cacheDashboardOrders();

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
