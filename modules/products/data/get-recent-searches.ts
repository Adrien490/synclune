import "server-only";

import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { logger } from "@/shared/lib/logger";
import {
	RECENT_SEARCHES_COOKIE_NAME,
	RECENT_SEARCHES_MAX_ITEMS,
} from "../constants/recent-searches";

/**
 * Recupere les recherches recentes depuis les cookies
 *
 * Note: Pas de cache car simple lecture de cookie (pas d'operation couteuse)
 *
 * @returns Liste des recherches recentes (max 5)
 */
export async function getRecentSearches(): Promise<string[]> {
	let cookieStore;
	try {
		cookieStore = await cookies();
	} catch (error) {
		unstable_rethrow(error);
		logger.error("Failed to read cookies for recent searches", error, {
			service: "getRecentSearches",
		});
		return [];
	}
	const cookie = cookieStore.get(RECENT_SEARCHES_COOKIE_NAME);

	if (!cookie?.value) {
		return [];
	}

	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(cookie.value));
		if (Array.isArray(parsed)) {
			return parsed
				.filter((s): s is string => typeof s === "string" && s.length <= 100)
				.slice(0, RECENT_SEARCHES_MAX_ITEMS);
		}
	} catch (error) {
		logger.error("Failed to parse recent searches cookie", error, {
			service: "getRecentSearches",
		});
	}

	return [];
}
