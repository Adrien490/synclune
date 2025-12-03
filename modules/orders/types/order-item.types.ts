import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { GET_ORDER_ITEM_DEFAULT_SELECT } from "../constants/order-item.constants";
import { getOrderItemSchema } from "../schemas/order-item.schemas";

// ============================================================================
// TYPES - ORDER ITEM
// ============================================================================

export type GetOrderItemParams = z.infer<typeof getOrderItemSchema>;

export type GetOrderItemReturn = Prisma.OrderItemGetPayload<{
	select: typeof GET_ORDER_ITEM_DEFAULT_SELECT;
}>;

export interface FetchOrderItemContext {
	admin: boolean;
	userId?: string;
}
