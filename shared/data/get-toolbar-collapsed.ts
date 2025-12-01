import { cookies } from "next/headers";

const COOKIE_NAME = "toolbar-collapsed";

/**
 * Récupère l'état collapsé du toolbar depuis les cookies
 * Retourne true si le toolbar doit être collapsé (défaut), false sinon
 */
export async function getToolbarCollapsed(): Promise<boolean> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(COOKIE_NAME);
	// Par défaut collapsé sur mobile (true)
	return cookie?.value !== "false";
}
