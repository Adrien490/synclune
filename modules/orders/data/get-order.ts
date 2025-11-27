import { getSession } from "@/shared/utils/get-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { cacheDashboardOrders } from "@/modules/dashboard/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

import { GET_ORDER_SELECT } from "../constants/order.constants";
import { getOrderSchema } from "../schemas/order.schemas";
import type {
	GetOrderParams,
	GetOrderReturn,
	FetchOrderContext,
	OrderItem,
} from "../types/order.types";

// Re-export pour compatibilité
export { GET_ORDER_SELECT } from "../constants/order.constants";
export { getOrderSchema } from "../schemas/order.schemas";
export type {
	GetOrderParams,
	GetOrderReturn,
	FetchOrderContext,
	OrderItem,
} from "../types/order.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

export async function getOrder(
	params: Partial<GetOrderParams>
): Promise<GetOrderReturn | null> {
	const validation = getOrderSchema.safeParse(params ?? {});

	if (!validation.success) {
		if (process.env.NODE_ENV !== "production") {
			// console.warn("getOrder invalid params", validation.error.issues);
		}
		return null;
	}

	const admin = await isAdmin();
	const session = await getSession();

	if (!admin && !session?.user?.id) {
		return null;
	}

	return fetchOrder(validation.data, { admin, userId: session?.user?.id });
}

export async function fetchOrder(
	params: GetOrderParams,
	context: FetchOrderContext
): Promise<GetOrderReturn | null> {
	"use cache";
	cacheDashboardOrders();

	const where: Prisma.OrderWhereInput = {
		orderNumber: params.orderNumber,
	};

	if (!context.admin && context.userId) {
		where.userId = context.userId;
	}

	try {
		const order = await prisma.order.findFirst({
			where,
			select: GET_ORDER_SELECT,
		});

		return order;
	} catch (error) {
		if (process.env.NODE_ENV !== "production") {
			// console.error("fetchOrder error:", error);
		}
		return null;
	}
}
