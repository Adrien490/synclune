import { cache } from "react";
import { auth } from "@/modules/auth/lib/auth";
import { headers } from "next/headers";

/**
 * Récupère la session de l'utilisateur actuel.
 *
 * IMPORTANT: Cette fonction accède à headers() donc NE PEUT PAS être cachée.
 * Les fonctions appelantes doivent gérer leur propre cache en passant
 * les données de session (userId) en argument aux fonctions cachées.
 *
 * Pattern recommandé:
 * ```ts
 * // Fonction publique (non cachée)
 * export async function getData() {
 *   const session = await getSession();
 *   const userId = session?.user?.id;
 *   return fetchData(userId); // fetchData a "use cache: private"
 * }
 *
 * // Fonction cachée (reçoit userId en argument)
 * async function fetchData(userId?: string) {
 *   "use cache: private";
 *   cacheLife("checkout");
 *   // ...
 * }
 * ```
 *
 * ⚠️ EINV-SEC-008 — `session.user.role` est BEST-EFFORT, stale jusqu'à
 * `AUTH_SESSION_CONFIG.cookieCache.maxAge`. Tant que le cookie-cache signé est
 * valide, Better Auth le sert SANS AUCUNE lecture en base : le plugin
 * `customSession` — celui qui dégrade le rôle à `USER` pour un compte révoqué —
 * ne s'exécute même pas. Un compte suspendu ou rétrogradé garde donc un cookie
 * qui prétend `ADMIN` pendant toute cette fenêtre.
 *
 * → POUR TOUT CHEMIN DE PRIVILÈGE ADMIN, ne PAS lire `session.user.role` directement.
 *   Toujours passer par `requireAdmin()` / `requireAdminWithUser()` / `requireAdminApiRoute()`
 *   / `isVerifiedAdmin()` / `isAdmin()`, qui re-vérifient en base le rôle ET le statut
 *   de compte (`deletedAt` + `suspendedAt` + `accountStatus`).
 *
 * `cache()` déduplique la résolution de session au sein d'une même requête serveur
 * (layout admin + page + fetchers la demandent chacun). Aucune fenêtre de staleness
 * ajoutée : la mémoïsation meurt avec la requête. Sûr ici parce qu'aucune action
 * n'appelle `getSession()` APRÈS avoir muté la session — `signInEmail` et `logout`
 * passent tous deux par `auth.api.*` avec les headers bruts.
 */
export const getSession = cache(async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return session;
});
