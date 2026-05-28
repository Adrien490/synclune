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
 * ⚠️ EINV-SEC-008 — `session.user.role` est BEST-EFFORT (jusqu'à 5 min stale)
 * à cause du `cookieCache` Better Auth (`AUTH_SESSION_CONFIG.cookieCache.maxAge`).
 * En clair : si un admin est démoté en CUSTOMER, le cookie peut continuer d'indiquer
 * `role: "ADMIN"` pendant 5 min avant que la session ne se rafraîchisse.
 *
 * → POUR TOUT CHEMIN DE PRIVILÈGE ADMIN, ne PAS lire `session.user.role` directement.
 *   Toujours passer par `requireAdmin()` / `requireAdminWithUser()` / `requireAdminApiRoute()`
 *   qui re-vérifient le rôle depuis la DB (mitigation cookie cache stale).
 */
export async function getSession() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return session;
}
