import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { STOCK_THRESHOLDS } from "@/modules/skus/constants/inventory.constants";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "../constants/cache";
import type { InventoryKpisReturn } from "../types/dashboard.types";

// Type pour les résultats de l'agrégation SQL
type StockValueResult = {
	total_value: bigint | null;
	total_units: bigint | null;
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Recupere les KPIs de la section Inventaire
 * Ces statistiques ne dependent pas d'une periode (etat actuel du stock)
 */
export async function fetchInventoryKpis(): Promise<InventoryKpisReturn> {
	"use cache: remote";

	cacheDashboard(DASHBOARD_CACHE_TAGS.INVENTORY_KPIS);

	const [outOfStock, lowStock, stockValueResult, pendingNotifications] =
		await Promise.all([
			// SKUs en rupture de stock (inventory = 0)
			prisma.productSku.count({
				where: {
					isActive: true,
					inventory: 0,
				},
			}),

			// SKUs en stock bas (0 < inventory <= seuil)
			prisma.productSku.count({
				where: {
					isActive: true,
					inventory: {
						gt: 0,
						lte: STOCK_THRESHOLDS.LOW,
					},
				},
			}),

			// Valeur totale du stock - Agrégation SQL directe (optimisé)
			prisma.$queryRaw<StockValueResult[]>`
				SELECT
					SUM(inventory * "priceInclTax") as total_value,
					SUM(inventory) as total_units
				FROM "ProductSku"
				WHERE "isActive" = true AND inventory > 0
			`,

			// Demandes de notification en attente
			prisma.stockNotificationRequest.count({
				where: {
					status: StockNotificationStatus.PENDING,
				},
			}),
		]);

	// Extraire les résultats de l'agrégation
	const stockAgg = stockValueResult[0];
	const totalValue = Number(stockAgg?.total_value ?? 0);
	const totalUnits = Number(stockAgg?.total_units ?? 0);

	return {
		outOfStock: {
			count: outOfStock,
		},
		lowStock: {
			count: lowStock,
			threshold: STOCK_THRESHOLDS.LOW,
		},
		stockValue: {
			amount: totalValue,
			totalUnits,
		},
		stockNotifications: {
			pendingCount: pendingNotifications,
		},
	};
}
