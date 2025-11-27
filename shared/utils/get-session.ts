"use server";

import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import { USERS_CACHE_TAGS } from "@/modules/users/constants/cache";

/**
 * Récupère la session de l'utilisateur avec cache privé
 *
 * Utilise "use cache: private" pour :
 * - Permettre l'accès à headers()
 * - Cacher la session par utilisateur
 * - Réduire les appels répétés à auth.api.getSession()
 * - Permettre le runtime prefetching des pages qui dépendent de la session
 *
 * Cache : 1min stale minimum pour le prefetching
 */
export async function getSession() {
	"use cache: private";
	cacheLife({ stale: 60 }); // 1min minimum pour runtime prefetch

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// Tag pour invalidation lors de la déconnexion
	if (session?.user?.id) {
		cacheTag(USERS_CACHE_TAGS.SESSION(session.user.id));
	}

	return session;
}
