import { Prisma } from "@/app/generated/prisma";
import type { GetOrdersParams, OrderFilters } from "../types/order.types";

// ============================================================================
// ORDER QUERY BUILDER UTILS
// ============================================================================

export function buildOrderSearchConditions(
	search: string
): Prisma.OrderWhereInput | null {
	if (!search || search.trim().length === 0) {
		return null;
	}

	const searchTerm = search.trim();

	return {
		OR: [
			{
				orderNumber: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			{
				user: {
					email: {
						contains: searchTerm,
						mode: Prisma.QueryMode.insensitive,
					},
				},
			},
			{
				user: {
					name: {
						contains: searchTerm,
						mode: Prisma.QueryMode.insensitive,
					},
				},
			},
			{
				stripePaymentIntentId: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
		],
	};
}

export function buildOrderFilterConditions(
	filters: OrderFilters
): Prisma.OrderWhereInput {
	const conditions: Prisma.OrderWhereInput = {};

	if (filters.status !== undefined) {
		const statuses = Array.isArray(filters.status)
			? filters.status
			: [filters.status];
		conditions.status = statuses.length === 1 ? statuses[0] : { in: statuses };
	} else {
		// Par défaut, exclure les commandes PENDING (abandons de panier)
		// Ces commandes sont créées au clic "Procéder au paiement" mais jamais payées
		conditions.status = { not: "PENDING" };
	}

	if (filters.paymentStatus !== undefined) {
		const paymentStatuses = Array.isArray(filters.paymentStatus)
			? filters.paymentStatus
			: [filters.paymentStatus];
		conditions.paymentStatus =
			paymentStatuses.length === 1
				? paymentStatuses[0]
				: { in: paymentStatuses };
	}

	if (filters.fulfillmentStatus !== undefined) {
		const fulfillmentStatuses = Array.isArray(filters.fulfillmentStatus)
			? filters.fulfillmentStatus
			: [filters.fulfillmentStatus];
		conditions.fulfillmentStatus =
			fulfillmentStatuses.length === 1
				? fulfillmentStatuses[0]
				: { in: fulfillmentStatuses };
	}

	if (
		typeof filters.totalMin === "number" &&
		typeof filters.totalMax === "number"
	) {
		conditions.total = {
			gte: filters.totalMin,
			lte: filters.totalMax,
		};
	} else if (typeof filters.totalMin === "number") {
		conditions.total = { gte: filters.totalMin };
	} else if (typeof filters.totalMax === "number") {
		conditions.total = { lte: filters.totalMax };
	}

	if (
		filters.createdAfter instanceof Date &&
		filters.createdBefore instanceof Date
	) {
		conditions.createdAt = {
			gte: filters.createdAfter,
			lte: filters.createdBefore,
		};
	} else if (filters.createdAfter instanceof Date) {
		conditions.createdAt = { gte: filters.createdAfter };
	} else if (filters.createdBefore instanceof Date) {
		conditions.createdAt = { lte: filters.createdBefore };
	}

	return conditions;
}

export function buildOrderWhereClause(
	params: GetOrdersParams
): Prisma.OrderWhereInput {
	const whereClause: Prisma.OrderWhereInput = {
		// Soft delete: exclure les commandes supprimées par défaut
		deletedAt: null,
	};
	const andConditions: Prisma.OrderWhereInput[] = [];

	// Toujours appliquer les filtres (inclut l'exclusion par défaut des PENDING)
	const filterConditions = buildOrderFilterConditions(
		params.filters ?? { showDeleted: undefined }
	);
	andConditions.push(filterConditions);

	if (params.search) {
		const searchConditions = buildOrderSearchConditions(params.search);
		if (searchConditions) {
			andConditions.push(searchConditions);
		}
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
}
