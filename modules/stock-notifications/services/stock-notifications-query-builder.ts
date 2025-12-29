import { Prisma } from "@/app/generated/prisma/client";
import { getSortDirection } from "@/shared/utils/sort-direction";
import type { GetStockNotificationsAdminParams } from "../types/stock-notification.types";

// ============================================================================
// STOCK NOTIFICATIONS QUERY BUILDER
// ============================================================================

/**
 * Construit la clause WHERE pour la recherche de notifications de stock
 */
export function buildStockNotificationWhereClause(
	params: GetStockNotificationsAdminParams
): Prisma.StockNotificationRequestWhereInput {
	const { filters } = params;

	// Base where clause avec soft delete et filtrage utilisateurs soft-deleted
	const where: Prisma.StockNotificationRequestWhereInput = {
		deletedAt: null, // Exclure les notifications soft-deleted
		OR: [
			{ user: null }, // Visiteurs anonymes
			{ user: { deletedAt: null } }, // Utilisateurs actifs
		],
	};

	if (filters?.status) {
		where.status = filters.status;
	}

	if (filters?.search) {
		where.AND = [
			{
				OR: [
					{ email: { contains: filters.search, mode: "insensitive" } },
					{
						sku: {
							product: {
								title: { contains: filters.search, mode: "insensitive" },
							},
						},
					},
				],
			},
		];
	}

	return where;
}

/**
 * Construit la clause ORDER BY pour les notifications de stock
 */
export function buildStockNotificationOrderBy(
	sortBy?: string
): Prisma.StockNotificationRequestOrderByWithRelationInput[] {
	const sortDirection = getSortDirection(sortBy || "created-descending");

	if (sortBy?.startsWith("status-")) {
		return [{ status: sortDirection }, { id: "asc" }];
	}

	if (sortBy?.startsWith("product-")) {
		return [
			{ sku: { product: { title: sortDirection } } },
			{ id: "asc" },
		];
	}

	// Default: tri par date de création
	return [{ createdAt: sortDirection }, { id: "asc" }];
}
