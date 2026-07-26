"use server";

import { updateTag } from "next/cache";

import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { handleActionError, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";

import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { USERS_CACHE_TAGS } from "@/modules/users/constants/cache";

/**
 * Invalide le cache des commandes de l'utilisateur courant (espace client).
 *
 * Pendant du `refreshOrders` admin, côté client. Nécessaire parce que la liste est
 * servie depuis le profil de cache `user` (stale 2 min) : un `router.refresh()`
 * seul re-rend l'arbre RSC sans purger l'entrée `use cache`, donc rendait les
 * mêmes données. Alimente à la fois le bouton visible « Actualiser » et le geste
 * pull-to-refresh (`usePullToRefreshHandler`) — un seul chemin d'invalidation.
 *
 * Strictement scopé à `session.user.id` : aucun paramètre n'est accepté, donc
 * aucun moyen d'invalider le cache d'un autre utilisateur.
 */
export async function refreshUserOrders(
	_prevState: unknown,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ORDER_LIMITS.USER_REFRESH);
		if ("error" in rateLimit) return rateLimit.error;

		const userId = auth.user.id;
		updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(userId));
		updateTag(ORDERS_CACHE_TAGS.LAST_ORDER(userId));
		updateTag(USERS_CACHE_TAGS.USER_ORDERS_COUNT(userId));

		return success("Commandes actualisées");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'actualisation");
	}
}
