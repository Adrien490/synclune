"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success } from "@/shared/lib/actions";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshCollections(
	_prevState: unknown,
	_formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		// Invalidate all collection cache tags
		updateTag(COLLECTIONS_CACHE_TAGS.LIST);
		updateTag(COLLECTIONS_CACHE_TAGS.COUNTS);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		return success("Collections rafraîchies");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
