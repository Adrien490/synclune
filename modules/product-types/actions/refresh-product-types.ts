"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { handleActionError, success } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";

export async function refreshProductTypes(
	_prevState: ActionState | undefined,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "productType.refreshCache",
			targetType: "productType",
			targetId: "all",
		});

		return success("Types de produits rafraîchis");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
