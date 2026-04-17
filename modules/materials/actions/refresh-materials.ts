"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { handleActionError, success } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

import { MATERIALS_CACHE_TAGS } from "../constants/cache";

export async function refreshMaterials(
	_prevState: unknown,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		updateTag(MATERIALS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "material.refresh",
			targetType: "material",
			targetId: "all",
		});

		return success("Matériaux rafraîchis");
	} catch (e) {
		return handleActionError(e, "Impossible de rafraichir les materiaux");
	}
}
