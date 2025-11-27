import { getSession } from "@/shared/utils/get-session";
import { isAdmin } from "@/shared/lib/guards";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

import { GET_ORDER_ITEM_DEFAULT_SELECT } from "../constants/order-item.constants";
import { getOrderItemSchema } from "../schemas/order-item.schemas";
import type {
	GetOrderItemParams,
	GetOrderItemReturn,
	FetchOrderItemContext,
} from "../types/order-item.types";

// Re-export pour compatibilité
export { GET_ORDER_ITEM_DEFAULT_SELECT } from "../constants/order-item.constants";
export { getOrderItemSchema } from "../schemas/order-item.schemas";
export type {
	GetOrderItemParams,
	GetOrderItemReturn,
	FetchOrderItemContext,
} from "../types/order-item.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un item de commande par son ID
 * - Admin : peut voir tous les items
 * - User : ne voit que ses propres items
 */
export async function getOrderItem(
	params: Partial<GetOrderItemParams>
): Promise<GetOrderItemReturn | null> {
	const validation = getOrderItemSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();
	const session = await getSession();

	if (!admin && !session?.user?.id) {
		return null;
	}

	return fetchOrderItem(validation.data, { admin, userId: session?.user?.id });
}

/**
 * Récupère un item de commande depuis la DB avec cache
 */
export async function fetchOrderItem(
	params: GetOrderItemParams,
	context: FetchOrderItemContext
): Promise<GetOrderItemReturn | null> {
	"use cache";
	cacheDashboard();

	const where: Prisma.OrderItemWhereInput = {
		id: params.id,
	};

	if (!context.admin && context.userId) {
		where.order = {
			userId: context.userId,
		};
	}

	try {
		const orderItem = await prisma.orderItem.findFirst({
			where,
			select: GET_ORDER_ITEM_DEFAULT_SELECT,
		});

		return orderItem;
	} catch (error) {
		return null;
	}
}
