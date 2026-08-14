"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { ADMIN_DASHBOARD_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success } from "@/shared/lib/actions";
import { DASHBOARD_CACHE_TAGS } from "../constants/cache";

export async function refreshDashboard(
	_prevState: unknown,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DASHBOARD_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		for (const tag of Object.values(DASHBOARD_CACHE_TAGS)) {
			updateTag(tag);
		}

		return success("Tableau de bord rafraichi");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraichissement");
	}
}
