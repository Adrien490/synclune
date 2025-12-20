import { auth } from "@/modules/auth/lib/auth";
import { headers } from "next/headers";

/**
 * Récupère la session de l'utilisateur actuel
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
 *   cacheLife("session");
 *   // ...
 * }
 * ```
 */
export async function getSession() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return session;
}
