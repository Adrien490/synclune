import { isAdmin } from "@/modules/auth/utils/guards";
import { STOCK_THRESHOLDS } from "@/modules/skus/constants/inventory.constants";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import type { StockAlertItem, GetStockAlertsReturn } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { StockAlertItem, GetStockAlertsReturn } from "../types/dashboard.types";
export type GetDashboardStockAlertsReturn = GetStockAlertsReturn;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour recuperer les alertes stock
 * Ruptures (inventory = 0) + faible stock (inventory <= STOCK_THRESHOLDS.LOW)
 *
 * @param skip - Nombre d'alertes a ignorer (pagination)
 * @param take - Nombre d'alertes a retourner (pagination)
 */
export async function getStockAlerts(
	skip: number = 0,
	take: number = 10
): Promise<GetStockAlertsReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return fetchDashboardStockAlerts(skip, take);
}

/**
 * Recupere les alertes stock depuis la DB avec cache
 *
 * @param skip - Nombre d'alertes a ignorer (pagination)
 * @param take - Nombre d'alertes a retourner (pagination)
 */
export async function fetchDashboardStockAlerts(
	skip: number = 0,
	take: number = 10
): Promise<GetStockAlertsReturn> {
	"use cache: remote";

	cacheDashboard();

	const whereClause = {
		isActive: true,
		inventory: {
			lte: STOCK_THRESHOLDS.LOW,
		},
	};

	const [skus, totalCount] = await Promise.all([
		prisma.productSku.findMany({
			where: whereClause,
			skip,
			take,
			orderBy: [{ inventory: "asc" }, { updatedAt: "desc" }],
			select: {
				id: true,
				sku: true,
				inventory: true,
				product: {
					select: {
						title: true,
					},
				},
			},
		}),
		prisma.productSku.count({ where: whereClause }),
	]);

	const alerts = skus.map((sku) => ({
		skuId: sku.id,
		sku: sku.sku,
		productTitle: sku.product.title,
		inventory: sku.inventory,
		alertType: (sku.inventory === 0 ? "out_of_stock" : "low_stock") as
			| "out_of_stock"
			| "low_stock",
	}));

	return { alerts, totalCount };
}
