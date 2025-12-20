import "server-only"

import { cookies } from "next/headers"
import { RECENT_SEARCHES_COOKIE_NAME, RECENT_SEARCHES_MAX_ITEMS } from "@/shared/constants/recent-searches"

/**
 * Recupere les recherches recentes depuis les cookies
 *
 * Note: Pas de cache car simple lecture de cookie (pas d'operation couteuse)
 *
 * @returns Liste des recherches recentes (max 5)
 */
export async function getRecentSearches(): Promise<string[]> {
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
