"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import type { ActionState } from "@/shared/types/server-action";
import { success, handleActionError } from "@/shared/lib/actions";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshProducts(
	_prevState: unknown,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// Ne délègue PAS à `getProductInvalidationTags` : ce helper exige un slug (pour
		// `DETAIL` et `RELATED_CONTEXTUAL`) qu'un rafraîchissement global n'a pas. On
		// reprend donc uniquement ses tags GLOBAUX — la liste omettait `SITEMAP_IMAGES`,
		// `ADMIN_INVENTORY_LIST`, `RELATED_PUBLIC` et `PRODUCT_TYPES_LIST`, laissant
		// l'admin devant un « Rafraîchi » qui ne rafraîchissait pas l'inventaire ni le
		// sitemap images.
		// Les tags par-slug restent hors de portée ici, par construction.
		const globalTags = [
			PRODUCTS_CACHE_TAGS.LIST,
			PRODUCTS_CACHE_TAGS.COUNTS,
			PRODUCTS_CACHE_TAGS.MAX_PRICE,
			PRODUCTS_CACHE_TAGS.VARIANTS_LIST,
			PRODUCTS_CACHE_TAGS.RELATED_PUBLIC,
			SHARED_CACHE_TAGS.PRODUCT_TYPES_LIST,
			SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
			SHARED_CACHE_TAGS.ADMIN_BADGES,
			SHARED_CACHE_TAGS.SITEMAP_IMAGES,
			// Global lui aussi (présent dans getProductInvalidationTags) : les bento
			// collections (/collections + mega-menu) montrent des images de produits.
			SHARED_CACHE_TAGS.COLLECTIONS_LIST,
		];
		globalTags.forEach((tag) => updateTag(tag));

		return success("Produits rafraîchis");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
