"use server";

import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { success, handleActionError } from "@/shared/lib/actions";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshUsers(
	_prevState: unknown,
	_formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Revalidation du cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success("Utilisateurs rafraîchis");
	} catch (e) {
		return handleActionError(e, "Erreur lors du rafraîchissement");
	}
}
