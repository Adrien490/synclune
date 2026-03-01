import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import { type GET_ORDER_ITEMS_DEFAULT_SELECT } from "../constants/order-items.constants";
import { type getOrderItemsSchema } from "../schemas/order-items.schemas";

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
