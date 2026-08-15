"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { handleActionError, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

import { MATERIALS_CACHE_TAGS } from "../constants/cache";

export async function refreshMaterials(
	_prevState: unknown,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		updateTag(MATERIALS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success("Matériaux rafraîchis");
	} catch (e) {
		return handleActionError(e, "Impossible de rafraîchir les matériaux");
	}
}
