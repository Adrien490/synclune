import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardStockValue } from "../constants/cache";
import type { StockValueReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calcule la valeur totale du stock
 * Optimise avec agregation SQL cote DB (evite de charger tous les SKUs en memoire)
 */
export async function fetchStockValue(): Promise<StockValueReturn> {
	"use cache: remote";

	cacheDashboardStockValue();

	// Agregation SQL optimisee - une seule requete au lieu de charger tous les SKUs
	const result = await prisma.$queryRaw<
		[
			{
				totalValue: bigint | null;
				totalUnits: bigint | null;
				skuCount: bigint;
			},
		]
	>`
    SELECT
      COALESCE(SUM(inventory * "priceInclTax"), 0) as "totalValue",
      COALESCE(SUM(inventory), 0) as "totalUnits",
      COUNT(*) as "skuCount"
    FROM "ProductSku"
    WHERE "isActive" = true AND inventory > 0
  `;

	const { totalValue, totalUnits, skuCount } = result[0];
	const totalValueNum = Number(totalValue ?? 0);
	const totalUnitsNum = Number(totalUnits ?? 0);
	const skuCountNum = Number(skuCount);

	return {
		totalValue: totalValueNum,
		skuCount: skuCountNum,
		totalUnits: totalUnitsNum,
		averageUnitValue:
			totalUnitsNum > 0
				? Math.round((totalValueNum / totalUnitsNum) * 100) / 100
				: 0,
	};
}
