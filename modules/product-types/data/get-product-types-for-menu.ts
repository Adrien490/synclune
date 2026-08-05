import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";

import { cacheProductTypesList } from "../constants/cache";
import { GET_PRODUCT_TYPES_MENU_SELECT } from "../constants/product-type.constants";
import type { MenuProductType } from "../types/product-type.types";

/**
 * Familles pour les menus de navigation (« L'étal de poche ») : les types
 * actifs ayant au moins un produit PUBLIC, avec compte de pièces et un produit
 * représentatif pour la vignette (cf. `GET_PRODUCT_TYPES_MENU_SELECT`).
 *
 * Publique PAR CONSTRUCTION : les filtres sont figés ici (`isActive: true`,
 * produits PUBLIC non supprimés), il n'y a ni params ni session — donc aucune
 * lecture de `headers()`, et la fonction est directement utilisable depuis un
 * scope `"use cache"` sans le détour `options.isAdmin` de `getProductTypes`.
 *
 * Même tag LIST que `fetchProductTypes` : toute mutation de type de produit
 * invalide les deux surfaces d'un coup.
 */
export async function getProductTypesForMenu(): Promise<{
	productTypes: MenuProductType[];
	totalCount: number;
}> {
	"use cache";
	cacheProductTypesList();

	try {
		const productTypes = await prisma.productType.findMany({
			where: {
				isActive: true,
				// Même critère que `buildProductTypeFilterConditions({ hasProducts:
				// true })` : un type sans produit PUBLIC est une catégorie vide.
				products: { some: { status: "PUBLIC", deletedAt: null } },
			},
			select: GET_PRODUCT_TYPES_MENU_SELECT,
			orderBy: [{ label: "asc" }, { id: "asc" }],
			take: 12,
		});

		return { productTypes, totalCount: productTypes.length };
	} catch (error) {
		Sentry.captureException(error, {
			tags: { module: "product-types", operation: "getProductTypesForMenu" },
		});
		// Rethrow → le repli vide vit chez l'appelant (getNavbarMenuData), hors
		// scope cache, pour ne pas figer une valeur dégradée (CACHE-DEGRADED-VALUE-001).
		throw error;
	}
}
