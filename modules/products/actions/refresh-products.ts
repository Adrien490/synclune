"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import type { ActionState } from "@/shared/types/server-action";
import { success, handleActionError } from "@/shared/lib/actions";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { ADMIN_PRODUCT_REFRESH_LIMIT } from "@/shared/lib/rate-limit-config";

export async function refreshProducts(
	_prevState: unknown,
	_formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_REFRESH_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		updateTag(PRODUCTS_CACHE_TAGS.LIST);
		updateTag(PRODUCTS_CACHE_TAGS.COUNTS);
		updateTag(PRODUCTS_CACHE_TAGS.MAX_PRICE);
		updateTag(PRODUCTS_CACHE_TAGS.SKUS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success("Produits rafraîchis");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
