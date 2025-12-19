import "server-only";

import { cookies } from "next/headers";
import { SWIPE_HINT_COOKIE_NAME } from "../constants/swipe-hint";

/**
 * Récupère si l'utilisateur a déjà vu l'indicateur de swipe
 * @returns true si l'indicateur a déjà été vu
 */
export async function getSwipeHintSeen(): Promise<boolean> {
	const cookieStore = await cookies();
	return cookieStore.get(SWIPE_HINT_COOKIE_NAME)?.value === "true";
}
