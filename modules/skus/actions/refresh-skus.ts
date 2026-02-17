"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_TOGGLE_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success } from "@/shared/lib/actions";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

const optionalCuid2Schema = z.string().cuid2().optional();

export async function refreshSkus(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Auth first
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_TOGGLE_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const rawProductId = formData.get("productId") as string | null;

		// Invalider les tags des SKUs
		updateTag(PRODUCTS_CACHE_TAGS.SKUS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);

		// Si un productId valide est fourni, invalider aussi les SKUs de ce produit
		const productId = optionalCuid2Schema.safeParse(rawProductId || undefined);
		if (productId.success && productId.data) {
			updateTag(PRODUCTS_CACHE_TAGS.SKUS(productId.data));
		}

		return success("Variantes rafraichies");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
