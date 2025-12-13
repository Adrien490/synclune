import { prisma } from "@/shared/lib/prisma";

import { GET_PRODUCT_SELECT } from "../constants/product.constants";
import { getProductSchema } from "../schemas/product.schemas";
import type {
	GetProductParams,
	GetProductReturn,
} from "../types/product.types";
import { cacheProductDetail } from "../constants/cache";

// Re-export pour compatibilité
export type {
	GetProductParams,
	GetProductReturn,
	ProductSku,
	ProductVariantInfo,
} from "../types/product.types";

export async function getProductBySlug(
	params: Partial<GetProductParams>
): Promise<GetProductReturn | null> {
	const validation = getProductSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	return fetchProduct(validation.data);
}

/**
 * Fonction interne avec cache pour récupérer le produit
 * Utilise findUnique pour exploiter l'index unique sur slug (~40-50% plus rapide)
 */
async function fetchProduct(
	params: GetProductParams
): Promise<GetProductReturn | null> {
	"use cache";
	cacheProductDetail(params.slug);

	try {
		const product = await prisma.product.findUnique({
			where: { slug: params.slug },
			select: GET_PRODUCT_SELECT,
		});

		if (!product) {
			return null;
		}

		if (!params.includeDraft && product.status !== "PUBLIC") {
			return null;
		}

		return product;
	} catch {
		return null;
	}
}
