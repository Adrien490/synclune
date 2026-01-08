import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import { transformSkusToStockAlerts } from "../services/stock-alert-classifier.service";
import type { GetStockAlertsReturn } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { StockAlertItem, GetStockAlertsReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

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
	"use cache";

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

	const alerts = transformSkusToStockAlerts(skus);

	return { alerts, totalCount };
}
