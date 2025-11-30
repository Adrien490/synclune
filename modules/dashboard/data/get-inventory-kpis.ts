import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { LOW_STOCK_THRESHOLD } from "@/modules/skus/constants/inventory.constants";
import { cacheDashboardInventoryStats } from "../constants/cache";
import type { InventoryKpisReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Recupere les KPIs de la section Inventaire
 * Ces statistiques ne dependent pas d'une periode (etat actuel du stock)
 */
export async function fetchInventoryKpis(): Promise<InventoryKpisReturn> {
	"use cache: remote";

	cacheDashboardInventoryStats();

	const [outOfStock, lowStock, stockValue, pendingNotifications] =
		await Promise.all([
			// SKUs en rupture de stock (inventory = 0)
			prisma.productSku.count({
				where: {
					isActive: true,
					inventory: 0,
				},
			}),

			// SKUs en stock bas (0 < inventory < seuil)
			prisma.productSku.count({
				where: {
					isActive: true,
					inventory: {
						gt: 0,
						lt: LOW_STOCK_THRESHOLD,
					},
				},
			}),

			// Valeur totale du stock
			prisma.productSku.findMany({
				where: {
					isActive: true,
					inventory: { gt: 0 },
				},
				select: {
					inventory: true,
					priceInclTax: true,
				},
			}),

			// Demandes de notification en attente
			prisma.stockNotificationRequest.count({
				where: {
					status: StockNotificationStatus.PENDING,
				},
			}),
		]);

	// Calculer la valeur du stock et le total d'unites
	let totalValue = 0;
	let totalUnits = 0;

	for (const sku of stockValue) {
		totalValue += sku.inventory * sku.priceInclTax;
		totalUnits += sku.inventory;
	}

	return {
		outOfStock: {
			count: outOfStock,
		},
		lowStock: {
			count: lowStock,
			threshold: LOW_STOCK_THRESHOLD,
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
