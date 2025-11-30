import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardStockValue } from "../constants/cache";
import type { StockValueReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calcule la valeur totale du stock
 */
export async function fetchStockValue(): Promise<StockValueReturn> {
	"use cache: remote";

	cacheDashboardStockValue();

	const skus = await prisma.productSku.findMany({
		where: {
			isActive: true,
			inventory: { gt: 0 },
		},
		select: {
			inventory: true,
			priceInclTax: true,
		},
	});

	let totalValue = 0;
	let totalUnits = 0;

	for (const sku of skus) {
		totalValue += sku.inventory * sku.priceInclTax;
		totalUnits += sku.inventory;
	}

	const skuCount = skus.length;
	const averageUnitValue = totalUnits > 0 ? totalValue / totalUnits : 0;

	return {
		totalValue,
		skuCount,
		totalUnits,
		averageUnitValue,
	};
}
