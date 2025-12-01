"use server";

import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin, success, handleActionError } from "@/shared/lib/actions";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshUsers(
	_prevState: unknown,
	_formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Revalidation du cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success("Utilisateurs rafraîchis");
	} catch (e) {
		return handleActionError(e, "Erreur lors du rafraîchissement");
	}
}
