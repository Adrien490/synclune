import { Prisma } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { cacheProductTypes } from "../constants/cache";

import { GET_PRODUCT_TYPE_SELECT } from "../constants/product-type.constants";
import { getProductTypeSchema } from "../schemas/product-type.schemas";
import type {
	GetProductTypeParams,
	GetProductTypeReturn,
} from "../types/product-type.types";

// Re-export pour compatibilité
export type {
	GetProductTypeParams,
	GetProductTypeReturn,
} from "../types/product-type.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un type de produit par son slug
 */
export async function getProductTypeBySlug(
	params: Partial<GetProductTypeParams>
): Promise<GetProductTypeReturn | null> {
	const validation = getProductTypeSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();

	return fetchProductType(validation.data, { admin });
}

/**
 * Récupère le type de produit depuis la DB avec cache
 */
async function fetchProductType(
	params: GetProductTypeParams,
	context: { admin: boolean }
): Promise<GetProductTypeReturn | null> {
	"use cache";
	cacheProductTypes();

	const includeInactive = context.admin
		? params.includeInactive === true
		: false;

	const where: Prisma.ProductTypeWhereInput = {
		slug: params.slug,
	};

	if (!includeInactive) {
		where.isActive = true;
	}

	try {
		const productType = await prisma.productType.findFirst({
			where,
			select: GET_PRODUCT_TYPE_SELECT,
		});

		return productType;
	} catch {
		return null;
	}
}
