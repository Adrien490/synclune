"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success } from "@/shared/lib/actions";
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { REVIEWS_CACHE_TAGS } from "../constants/cache";

/**
 * Purge le cache de la liste admin des avis.
 *
 * Parité avec les 10 autres listes admin, qui exposent toutes un bouton
 * « Rafraîchir » : `ADMIN_REVIEW_LIMITS.REFRESH` était déjà provisionné mais
 * n'avait aucun appelant.
 */
export async function refreshReviews(
	_prevState: unknown,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_REVIEW_LIMITS.REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		updateTag(REVIEWS_CACHE_TAGS.ADMIN_LIST);
		updateTag(REVIEWS_CACHE_TAGS.GLOBAL_STATS);

		return success("Avis rafraichis");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du rafraichissement");
	}
}
