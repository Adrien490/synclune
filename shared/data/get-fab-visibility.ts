import "server-only";

import { cookies } from "next/headers";
import { type FabKey, getFabCookieName } from "@/shared/constants/fab";

/**
 * Récupère la visibilité d'un FAB depuis les cookies
 *
 * Note: Pas de cache car simple lecture de cookie (pas d'opération coûteuse)
 *
 * @param key - Clé du FAB
 * @returns true si le FAB doit être caché, false sinon
 */
export async function getFabVisibility(key: FabKey): Promise<boolean> {
	const cookieStore = await cookies();
	const cookieName = getFabCookieName(key);
	const cookie = cookieStore.get(cookieName);
	return cookie?.value === "true";
}
