import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { cacheProductTypesPublic } from "../constants/cache";
import type { ProductTypeOption } from "../types/product-type.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère tous les types de produits pour les selects/filtres
 * Version simplifiée sans pagination
 */
export async function getProductTypeOptions(): Promise<ProductTypeOption[]> {
	return fetchProductTypeOptions();
}

/**
 * Récupère les types de produits pour les selects depuis la DB avec cache
 */
async function fetchProductTypeOptions(): Promise<ProductTypeOption[]> {
	"use cache";
	cacheProductTypesPublic();

	try {
		const productTypes = await prisma.productType.findMany({
			select: {
				id: true,
				label: true,
			},
			orderBy: [{ position: "asc" }, { label: "asc" }],
		});

		return productTypes;
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "product-types", operation: "getProductTypeOptions" },
		});
		throw error;
	}
}
