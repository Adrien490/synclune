import { prisma } from "@/shared/lib/prisma";
import { cacheProductTypes } from "../constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type ProductTypeOption = {
	id: string;
	label: string;
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère tous les types de produits actifs pour les selects/filtres
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
	cacheProductTypes();

	try {
		const productTypes = await prisma.productType.findMany({
			where: { isActive: true },
			select: {
				id: true,
				label: true,
			},
			orderBy: { label: "asc" },
		});

		return productTypes;
	} catch {
		return [];
	}
}
