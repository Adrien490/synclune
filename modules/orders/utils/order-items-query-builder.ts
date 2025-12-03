import { Prisma } from "@/app/generated/prisma";
import { z } from "zod";
import { orderItemFiltersSchema, getOrderItemsSchema } from "../schemas/order-items.schemas";

// ============================================================================
// ORDER ITEMS QUERY BUILDER UTILS
// ============================================================================

export function buildOrderItemsFilterConditions(
	filters: z.infer<typeof orderItemFiltersSchema>
): Prisma.OrderItemWhereInput[] {
	const conditions: Prisma.OrderItemWhereInput[] = [];

	if (!filters) return conditions;

	if (filters.orderId !== undefined) {
		const orderIds = Array.isArray(filters.orderId)
			? filters.orderId
			: [filters.orderId];
		conditions.push(
			orderIds.length === 1
				? { orderId: orderIds[0] }
				: { orderId: { in: orderIds } }
		);
	}

	if (filters.productId !== undefined) {
		const productIds = Array.isArray(filters.productId)
			? filters.productId
			: [filters.productId];
		conditions.push(
			productIds.length === 1
				? { productId: productIds[0] }
				: { productId: { in: productIds } }
		);
	}

	if (filters.skuId !== undefined) {
		const skuIds = Array.isArray(filters.skuId)
			? filters.skuId
			: [filters.skuId];
		conditions.push(
			skuIds.length === 1 ? { skuId: skuIds[0] } : { skuId: { in: skuIds } }
		);
	}

	if (typeof filters.priceMin === "number")
		conditions.push({ price: { gte: filters.priceMin } });
	if (typeof filters.priceMax === "number")
		conditions.push({ price: { lte: filters.priceMax } });
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
	params: z.infer<typeof getOrderItemsSchema>
): Prisma.OrderItemWhereInput {
	const whereClause: Prisma.OrderItemWhereInput = {};
	const filterConditions = buildOrderItemsFilterConditions(params.filters ?? {});

	if (filterConditions.length > 0) {
		whereClause.AND = filterConditions;
	}

	return whereClause;
}
