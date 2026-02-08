"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success } from "@/shared/lib/actions";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshSkus(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		const productId = formData.get("productId") as string | null;

		// Invalider les tags des SKUs
		updateTag(PRODUCTS_CACHE_TAGS.SKUS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);

		// Si un productId est fourni, invalider aussi les SKUs de ce produit
		if (productId) {
			updateTag(PRODUCTS_CACHE_TAGS.SKUS(productId));
		}

		return success("Variantes rafraichies");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
