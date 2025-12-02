import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

import { LOW_STOCK_THRESHOLD } from "../constants/inventory.constants";
import type { GetSkuStockReturn } from "../types/sku-stock.types";

// Re-export pour compatibilité
export type { GetSkuStockReturn } from "../types/sku-stock.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer le stock d'un SKU en temps réel
 */
export async function getSkuStock(skuId: string): Promise<GetSkuStockReturn> {
	if (!skuId || typeof skuId !== "string") {
		return null;
	}

	return fetchSkuStock(skuId);
}

/**
 * Récupère le stock d'un SKU avec use cache: remote
 * Cache partagé entre tous les utilisateurs
 */
async function fetchSkuStock(skuId: string): Promise<GetSkuStockReturn> {
	"use cache: remote";
	cacheLife("skuStock");
	cacheTag(`sku-stock-${skuId}`);

	try {
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				inventory: true,
				isActive: true,
			},
		});

		if (!sku) {
			return null;
		}

		const available = sku.inventory;

		return {
			available,
			isInStock: available > 0,
			isActive: sku.isActive,
			lowStock: available > 0 && available < LOW_STOCK_THRESHOLD,
		};
	} catch {
		return null;
	}
}
