import { cache } from "react";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { isVerifiedAdmin } from "@/modules/auth/lib/require-auth";

/**
 * Vérifie si l'utilisateur actuel est RÉELLEMENT admin (re-vérification DB).
 *
 * ⚠️ Ne JAMAIS revenir à `session.user.role === "ADMIN"` seul : tant que le
 * cookieCache Better Auth est valide (`AUTH_SESSION_CONFIG.cookieCache.maxAge`),
 * la session est servie SANS lecture en base, donc un admin
 * rétrogradé/suspendu/supprimé garde un cookie qui prétend encore `ADMIN`.
 * Cf. `get-current-session.ts` (EINV-SEC-008) et le garde-fou
 * `__tests__/no-raw-session-role-trust.regression.test.ts`.
 *
 * Délègue à `isVerifiedAdmin()` qui court-circuite AVANT la requête DB quand le
 * cookie ne prétend pas admin → aucun coût pour les invités et les clients.
 *
 * `cache()` déduplique l'appel au sein d'une même requête serveur (une page
 * admin appelle plusieurs fonctions `data/` qui passent chacune par ce guard).
 * Ce n'est pas un cache temporel : aucune fenêtre de staleness introduite.
 */
export const isAdmin = cache(async (): Promise<boolean> => {
	try {
		return await isVerifiedAdmin(await getSession());
	} catch {
		return false;
	}
});
