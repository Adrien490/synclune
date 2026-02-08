"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success } from "@/shared/lib/actions";
import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshCollections(
	_prevState: unknown,
	_formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// Invalider tous les tags du cache collections
		updateTag(COLLECTIONS_CACHE_TAGS.LIST);
		updateTag(COLLECTIONS_CACHE_TAGS.COUNTS);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag("navbar-menu");

		return success("Collections rafraîchies");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
