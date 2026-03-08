import "server-only";

import { cookies } from "next/headers";
import { logger } from "@/shared/lib/logger";
import {
	RECENT_PRODUCTS_COOKIE_NAME,
	RECENT_PRODUCTS_MAX_ITEMS,
} from "../constants/recent-products";

/**
 * Recupere les slugs des produits recemment vus depuis les cookies
 *
 * Note: Pas de cache car simple lecture de cookie (pas d'operation couteuse)
 *
 * @returns Liste des slugs de produits recemment vus
 */
export async function getRecentProductSlugs(): Promise<string[]> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(RECENT_PRODUCTS_COOKIE_NAME);

	if (!cookie?.value) {
		return [];
	}

	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(cookie.value));
		if (Array.isArray(parsed)) {
			const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
			const MAX_SLUG_LENGTH = 100;
			const items = parsed as unknown as unknown[];
			return items
				.filter(
					(s): s is string =>
						typeof s === "string" && s.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(s),
				)
				.slice(0, RECENT_PRODUCTS_MAX_ITEMS);
		}
	} catch (e) {
		logger.error("Failed to parse recent products cookie", e, { service: "getRecentProductSlugs" });
	}

	return [];
}
