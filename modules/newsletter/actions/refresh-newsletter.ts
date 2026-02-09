"use server";

import { updateTag } from "next/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { handleActionError, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshNewsletter(
	_prevState: ActionState | undefined,
	_formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdminWithUser();
		if ("error" in admin) return admin.error;

		console.info("[REFRESH_NEWSLETTER] Cache refreshed by admin:", admin.user.id);

		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success("Newsletter rafraîchie");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraîchissement");
	}
}
