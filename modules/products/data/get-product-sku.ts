import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";

import { GET_PRODUCT_SKU_SELECT } from "../constants/product-sku.constants";
import { getProductSkuSchema } from "../schemas/product-sku.schemas";
import type {
	GetProductSkuParams,
	GetProductSkuReturn,
} from "../types/product-sku.types";
import { cacheSkuDetail } from "../constants/cache";

// Re-export pour compatibilité
export type { GetProductSkuParams, GetProductSkuReturn } from "../types/product-sku.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un SKU par son code
 * Protection: Nécessite un compte ADMIN
 */
export async function getSkuByCode(
	params: Partial<GetProductSkuParams>
): Promise<GetProductSkuReturn | null> {
	const validation = getProductSkuSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();

	if (!admin) {
		return null;
	}

	return fetchProductSku(validation.data);
}

/**
 * Récupère le SKU depuis la DB avec cache
 */
async function fetchProductSku(
	params: GetProductSkuParams
): Promise<GetProductSkuReturn | null> {
	"use cache";
	cacheSkuDetail(params.sku);

	try {
		const sku = await prisma.productSku.findUnique({
			where: { sku: params.sku },
			select: GET_PRODUCT_SKU_SELECT,
		});

		return sku;
	} catch {
		return null;
	}
}
