import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { type FabKey, getFabCookieName } from "@/shared/constants/fab";
import { FAB_CACHE_TAGS } from "@/shared/constants/fab-cache";

/**
 * Récupère la visibilité d'un FAB depuis les cookies
 *
 * Cache: private (dépend des cookies utilisateur)
 * Durée: reference (préférence stable)
 *
 * @param key - Clé du FAB
 * @returns true si le FAB doit être caché, false sinon
 */
export async function getFabVisibility(key: FabKey): Promise<boolean> {
	"use cache: private";
	cacheLife("reference");
	cacheTag(FAB_CACHE_TAGS.VISIBILITY(key));

	const cookieStore = await cookies();
	const cookieName = getFabCookieName(key);
	const cookie = cookieStore.get(cookieName);
	return cookie?.value === "true";
}
