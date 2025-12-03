import { Prisma } from "@/app/generated/prisma";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_ORDER_SELECT,
	GET_ORDERS_SELECT,
	GET_ORDERS_SORT_FIELDS,
} from "../constants/order.constants";
import {
	getOrderSchema,
	getOrdersSchema,
	orderFiltersSchema,
	deleteOrderSchema,
	bulkDeleteOrdersSchema,
	cancelOrderSchema,
} from "../schemas/order.schemas";

// ============================================================================
// TYPES - SINGLE ORDER
// ============================================================================

export type GetOrderParams = z.infer<typeof getOrderSchema>;

export type GetOrderReturn = Prisma.OrderGetPayload<{
	select: typeof GET_ORDER_SELECT;
}>;

export interface FetchOrderContext {
	admin: boolean;
	userId?: string;
}

export type OrderItem = GetOrderReturn["items"][0];

// ============================================================================
// TYPES - ORDER LIST
// ============================================================================

export type OrderFilters = z.infer<typeof orderFiltersSchema>;

export type OrderSortField = (typeof GET_ORDERS_SORT_FIELDS)[number];

export type GetOrdersParams = z.infer<typeof getOrdersSchema>;

export type GetOrdersReturn = {
	orders: Array<
		Prisma.OrderGetPayload<{ select: typeof GET_ORDERS_SELECT }>
	>;
	pagination: PaginationInfo;
};

export type Order = Prisma.OrderGetPayload<{
	select: typeof GET_ORDERS_SELECT;
}>;

// ============================================================================
// TYPES - MUTATIONS
// ============================================================================

export type DeleteOrderInput = z.infer<typeof deleteOrderSchema>;
export type BulkDeleteOrdersInput = z.infer<typeof bulkDeleteOrdersSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
