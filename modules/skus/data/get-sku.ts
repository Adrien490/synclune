import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { GET_PRODUCT_SKU_SELECT } from "../constants/sku.constants";
import { getProductSkuSchema } from "../schemas/sku.schemas";
import type {
	GetProductSkuParams,
	GetProductSkuReturn,
	SkuWithImages,
} from "../types/sku.types";
import { cacheSkuDetail } from "../utils/cache.utils";

// Re-export pour compatibilité
export type { GetProductSkuParams, GetProductSkuReturn, SkuWithImages } from "../types/sku.types";

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
	} catch (error) {
		console.error("[get-sku] Erreur fetchProductSku:", error);
		return null;
	}
}

// ============================================================================
// GET SKU BY ID (pour édition)
// ============================================================================

/**
 * Récupère un SKU par son ID avec ses images
 * Protection: Nécessite un compte ADMIN
 */
export async function getSkuById(skuId: string): Promise<SkuWithImages | null> {
	if (!skuId) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	return fetchSkuById(skuId);
}

/**
 * Récupère le SKU avec ses images depuis la DB avec cache
 */
async function fetchSkuById(skuId: string): Promise<SkuWithImages | null> {
	"use cache";
	cacheSkuDetail(skuId);

	try {
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				...GET_PRODUCT_SKU_SELECT,
				compareAtPrice: true,
				images: {
					select: {
						id: true,
						url: true,
						thumbnailUrl: true,
						blurDataUrl: true,
						altText: true,
						mediaType: true,
						isPrimary: true,
					},
					orderBy: { isPrimary: "desc" },
				},
			},
		});

		return sku;
	} catch (error) {
		console.error("[get-sku] Erreur fetchSkuById:", error);
		return null;
	}
}
