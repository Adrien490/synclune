import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import {
	type orderItemFiltersSchema,
	type getOrderItemsSchema,
} from "../schemas/order-items.schemas";

// ============================================================================
// ORDER ITEMS QUERY BUILDER UTILS
// ============================================================================

/**
 * Normalizes a `T | T[]` filter into a Prisma equality or `{ in: T[] }` clause —
 * keeps single-value queries from generating `IN (?)` plans.
 */
function toIn<T>(value: T | T[]): T | { in: T[] } {
	if (!Array.isArray(value)) return value;
	return value.length === 1 ? value[0]! : { in: value };
}

export function buildOrderItemsFilterConditions(
	filters: z.infer<typeof orderItemFiltersSchema>,
): Prisma.OrderItemWhereInput[] {
	const conditions: Prisma.OrderItemWhereInput[] = [];

	if (filters.orderId !== undefined) {
		conditions.push({ orderId: toIn(filters.orderId) });
	}

	if (filters.productId !== undefined) {
		conditions.push({ productId: toIn(filters.productId) });
	}

	if (filters.skuId !== undefined) {
		conditions.push({ skuId: toIn(filters.skuId) });
	}

	if (typeof filters.priceMin === "number") conditions.push({ price: { gte: filters.priceMin } });
	if (typeof filters.priceMax === "number") conditions.push({ price: { lte: filters.priceMax } });
	if (typeof filters.quantityMin === "number")
		conditions.push({ quantity: { gte: filters.quantityMin } });
	if (typeof filters.quantityMax === "number")
		conditions.push({ quantity: { lte: filters.quantityMax } });
	if (filters.createdAfter instanceof Date)
		conditions.push({ createdAt: { gte: filters.createdAfter } });
	if (filters.createdBefore instanceof Date)
		conditions.push({ createdAt: { lte: filters.createdBefore } });
	if (filters.updatedAfter instanceof Date)
		conditions.push({ updatedAt: { gte: filters.updatedAfter } });
	if (filters.updatedBefore instanceof Date)
		conditions.push({ updatedAt: { lte: filters.updatedBefore } });

	return conditions;
}

export function buildOrderItemsWhereClause(
	params: z.infer<typeof getOrderItemsSchema>,
): Prisma.OrderItemWhereInput {
	const whereClause: Prisma.OrderItemWhereInput = {};
	const filterConditions = buildOrderItemsFilterConditions(params.filters);

	if (filterConditions.length > 0) {
		whereClause.AND = filterConditions;
	}

	return whereClause;
}
