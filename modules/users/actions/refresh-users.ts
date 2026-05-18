"use server";

import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { success, handleActionError } from "@/shared/lib/actions";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshUsers(_prevState: unknown, _formData: FormData): Promise<ActionState> {
	try {
		// Auth avant rate-limit (anti-leak 429 vs 403)
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success("Utilisateurs rafraîchis");
	} catch (e) {
		return handleActionError(e, "Erreur lors du rafraîchissement");
	}
}
