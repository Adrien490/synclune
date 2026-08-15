"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { handleActionError, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";

import { COLORS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshColors(
	_prevState: unknown,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		updateTag(COLORS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success("Couleurs rafraîchies");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
