"use server";

import { cookies } from "next/headers";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { PRODUCT_LIMITS } from "@/shared/lib/rate-limit-config";
import { success, handleActionError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { RECENT_SEARCHES_COOKIE_NAME } from "../constants/recent-searches";

/**
 * Server Action pour effacer toutes les recherches recentes
 */
export async function clearRecentSearches(
	_prevState: ActionState | undefined,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const rateCheck = await enforceRateLimitForCurrentUser(PRODUCT_LIMITS.COOKIE_ACTION);
		if ("error" in rateCheck) return rateCheck.error;

		const cookieStore = await cookies();
		cookieStore.delete(RECENT_SEARCHES_COOKIE_NAME);

		// Aucune invalidation : cf. `add-recent-search.ts` — le lecteur cookie
		// `get-recent-searches.ts` n'est pas caché, `recent-searches-list` n'avait
		// aucun poseur.

		return success("Recherches effacees");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}
