import "server-only"

import { cookies } from "next/headers"
import {
	RECENT_PRODUCTS_COOKIE_NAME,
	RECENT_PRODUCTS_MAX_ITEMS,
} from "../constants/recent-products"

/**
 * Recupere les slugs des produits recemment vus depuis les cookies
 *
 * Note: Pas de cache car simple lecture de cookie (pas d'operation couteuse)
 *
 * @returns Liste des slugs de produits recemment vus
 */
export async function getRecentProductSlugs(): Promise<string[]> {
	const cookieStore = await cookies()
	const cookie = cookieStore.get(RECENT_PRODUCTS_COOKIE_NAME)

	if (!cookie?.value) {
		return []
	}

	try {
		const parsed = JSON.parse(decodeURIComponent(cookie.value))
		if (Array.isArray(parsed)) {
			return parsed.slice(0, RECENT_PRODUCTS_MAX_ITEMS)
		}
	} catch (e) {
		// Log en dev, silencieux en prod (cookie corrompu = ignore)
		if (process.env.NODE_ENV === "development") {
			console.error("[RecentProducts] Erreur parsing cookie:", e)
		}
	}

	return []
}
