"use server";

import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { success, handleActionError } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshUsers(_prevState: unknown, _formData: FormData): Promise<ActionState> {
	try {
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "user.refresh",
			targetType: "user",
			targetId: "list",
		});

		return success("Utilisateurs rafraîchis");
	} catch (e) {
		return handleActionError(e, "Erreur lors du rafraîchissement");
	}
}
