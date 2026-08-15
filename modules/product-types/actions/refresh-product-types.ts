"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { handleActionError, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";

export async function refreshProductTypes(
	_prevState: ActionState | undefined,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		return success("Types de produits rafraîchis");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
