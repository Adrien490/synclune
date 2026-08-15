"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, safeFormGet, success } from "@/shared/lib/actions";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

const optionalCuid2Schema = z.cuid2().optional();

export async function refreshVariants(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		const rawProductId = safeFormGet(formData, "productId");

		// Invalider les tags des VARIANTs
		updateTag(PRODUCTS_CACHE_TAGS.VARIANTS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);

		// Si un productId valide est fourni, invalider aussi les VARIANTs de ce produit
		const productId = optionalCuid2Schema.safeParse(rawProductId ?? undefined);
		const validProductId = productId.success && productId.data ? productId.data : null;
		if (validProductId) {
			updateTag(PRODUCTS_CACHE_TAGS.VARIANTS(validProductId));
		}

		return success("Variantes rafraichies");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
