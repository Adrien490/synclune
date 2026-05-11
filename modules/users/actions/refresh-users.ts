"use server";

import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { success, handleActionError } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USER_AUDIT_ACTIONS } from "../constants/audit-actions";

export async function refreshUsers(_prevState: unknown, _formData: FormData): Promise<ActionState> {
	try {
		// Auth avant rate-limit (anti-leak 429 vs 403)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: USER_AUDIT_ACTIONS.REFRESH,
			targetType: "user",
			targetId: "list",
		});

		return success("Utilisateurs rafraîchis");
	} catch (e) {
		return handleActionError(e, "Erreur lors du rafraîchissement");
	}
}
