import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { cookies } from "next/headers"
import { RECENT_SEARCHES_COOKIE_NAME, RECENT_SEARCHES_MAX_ITEMS } from "../constants"
import { RECENT_SEARCHES_CACHE_TAGS } from "../constants/cache"

/**
 * Recupere les recherches recentes depuis les cookies
 *
 * Cache: private (depend des cookies utilisateur)
 * Duree: reference (preference stable)
 *
 * @returns Liste des recherches recentes (max 5)
 */
export async function getRecentSearches(): Promise<string[]> {
	"use cache: private"
	cacheLife("reference")
	cacheTag(RECENT_SEARCHES_CACHE_TAGS.LIST)

	const cookieStore = await cookies()
	const cookie = cookieStore.get(RECENT_SEARCHES_COOKIE_NAME)

	if (!cookie?.value) {
		return []
	}

	try {
		const parsed = JSON.parse(decodeURIComponent(cookie.value))
		if (Array.isArray(parsed)) {
			return parsed.slice(0, RECENT_SEARCHES_MAX_ITEMS)
		}
	} catch {
		// Ignore les erreurs de parsing
	}

	return []
}
