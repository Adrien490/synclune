"use server";

import { cookies } from "next/headers";

const COOKIE_NAME = "toolbar-collapsed";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

/**
 * Server Action pour basculer l'état collapsé du toolbar
 * Stocke la préférence dans un cookie côté serveur
 */
export async function toggleToolbarCollapsed(
	collapsed: boolean
): Promise<{ success: boolean; collapsed: boolean }> {
	const cookieStore = await cookies();

	if (collapsed) {
		// Collapsé = supprimer le cookie (état par défaut)
		cookieStore.delete(COOKIE_NAME);
	} else {
		// Étendu = stocker "false"
		cookieStore.set(COOKIE_NAME, "false", {
			path: "/",
			maxAge: COOKIE_MAX_AGE,
			httpOnly: false,
			sameSite: "lax",
		});
	}

	return { success: true, collapsed };
}
