import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { MediaType } from "@/app/generated/prisma/client";

import { GET_PRODUCT_SKU_SELECT } from "../constants/sku.constants";
import { getProductSkuSchema } from "../schemas/sku.schemas";
import type {
	GetProductSkuParams,
	GetProductSkuReturn,
} from "../types/sku.types";
import { cacheSkuDetail } from "../constants/cache";

// Re-export pour compatibilité
export type { GetProductSkuParams, GetProductSkuReturn } from "../types/sku.types";

// Type pour SKU avec images (pour édition)
export type SkuWithImages = GetProductSkuReturn & {
	images: Array<{
		id: string;
		url: string;
		thumbnailUrl: string | null;
		thumbnailSmallUrl: string | null;
		blurDataUrl: string | null;
		altText: string | null;
		mediaType: MediaType;
		isPrimary: boolean;
	}>;
	compareAtPrice: number | null;
};

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
						thumbnailSmallUrl: true,
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
	} catch {
		return null;
	}
}
