"use server";

import { cookies } from "next/headers";
import { handleActionError, success } from "@/shared/lib/actions";
import { AUTH_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ADMIN_SESSION_COOKIE } from "@/modules/admin-auth/constants/admin-auth.constants";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";

/**
 * Déconnexion : supprime le cookie `admin_session`.
 *
 * Action publique par conception (déconnecter un cookie déjà invalide doit
 * marcher), plafonnée par rate limit — c'est un RPC atteignable hors UI.
 * Aucune écriture en base : la session n'existe que dans le cookie.
 */
export async function logout(): Promise<ActionState> {
	try {
		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.LOGOUT);
		if ("error" in rateLimit) return rateLimit.error;

		const cookieStore = await cookies();
		cookieStore.delete(ADMIN_SESSION_COOKIE);

		return success("Déconnexion réussie");
	} catch (err) {
		return handleActionError(err, "Une erreur est survenue lors de la déconnexion", {
			service: "admin-auth",
		});
	}
}
