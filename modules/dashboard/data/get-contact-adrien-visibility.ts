import { cookies } from "next/headers";

const COOKIE_NAME = "contact-adrien-hidden";

/**
 * Récupère la visibilité du bouton Contact Adrien depuis les cookies
 * Retourne true si le bouton doit être caché, false sinon
 */
export async function getContactAdrienVisibility(): Promise<boolean> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(COOKIE_NAME);
	return cookie?.value === "true";
}
