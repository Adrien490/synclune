import { isAdmin } from "@/shared/lib/guards";
import { cacheReference } from "@/shared/lib/cache";
import { prisma } from "@/shared/lib/prisma";

import { GET_SKU_MEDIA_SELECT } from "../constants/sku-media.constants";
import { getSkuMediaSchema } from "../schemas/sku-media.schemas";
import type {
	GetSkuMediaParams,
	GetSkuMediaReturn,
} from "../types/sku-media.types";

// Re-export pour compatibilité
export type { GetSkuMediaParams, GetSkuMediaReturn } from "../types/sku-media.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un média SKU par son ID
 * Protection: Nécessite un compte ADMIN
 */
export async function getSkuMedia(
	params: Partial<GetSkuMediaParams>
): Promise<GetSkuMediaReturn | null> {
	const validation = getSkuMediaSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();

	if (!admin) {
		return null;
	}

	return fetchSkuMedia(validation.data);
}

/**
 * Récupère le média depuis la DB avec cache
 */
async function fetchSkuMedia(
	params: GetSkuMediaParams
): Promise<GetSkuMediaReturn | null> {
	"use cache";
	cacheReference();

	try {
		const image = await prisma.skuMedia.findUnique({
			where: { id: params.id },
			select: GET_SKU_MEDIA_SELECT,
		});

		return image;
	} catch {
		return null;
	}
}
