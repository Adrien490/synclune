import { auth } from "@/modules/auth/lib/auth";
import { headers } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Récupère la session de l'utilisateur avec cache privé
 *
 * Utilise "use cache: private" pour :
 * - Permettre l'accès à headers()
 * - Cacher la session par utilisateur
 * - Réduire les appels répétés à auth.api.getSession()
 * - Permettre le runtime prefetching des pages qui dépendent de la session
 *
 * Note: Le cacheTag est appliqué AVANT la requête avec un tag générique
 * car les tags dynamiques post-requête ne sont pas garantis par Next.js.
 * L'invalidation utilise updateTag("session") pour invalider toutes les sessions.
 */
export async function getSession() {
	"use cache: private";
	cacheLife("session");
	cacheTag("session"); // Tag appliqué AVANT la requête async

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return session;
}
