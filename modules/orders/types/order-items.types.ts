import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/lib/pagination";
import { GET_ORDER_ITEMS_DEFAULT_SELECT } from "../constants/order-items.constants";
import { getOrderItemsSchema } from "../schemas/order-items.schemas";

// ============================================================================
// TYPES - ORDER ITEMS LIST
// ============================================================================

export type GetOrderItemsReturn = {
	orderItems: Array<
		Prisma.OrderItemGetPayload<{
			select: typeof GET_ORDER_ITEMS_DEFAULT_SELECT;
		}>
	>;
	pagination: PaginationInfo;
};

export type GetOrderItemsParams = z.infer<typeof getOrderItemsSchema>;
