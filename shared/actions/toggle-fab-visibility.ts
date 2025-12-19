"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import {
	type FabKey,
	FAB_COOKIE_MAX_AGE,
	getFabCookieName,
} from "@/shared/constants/fab";
import { getFabInvalidationTags } from "@/shared/constants/fab-cache";

/**
 * Server Action pour basculer la visibilité d'un FAB
 * Stocke la préférence dans un cookie côté serveur
 *
 * @param key - Clé du FAB (type-safe)
 * @param isHidden - true pour masquer, false pour afficher
 */
export async function toggleFabVisibility(
	key: FabKey,
	isHidden: boolean
): Promise<{ success: boolean; isHidden: boolean }> {
	const cookieStore = await cookies();
	const cookieName = getFabCookieName(key);

	if (isHidden) {
		cookieStore.set(cookieName, "true", {
			path: "/",
			maxAge: FAB_COOKIE_MAX_AGE,
			httpOnly: true,
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
		});
	} else {
		cookieStore.delete(cookieName);
	}

	// Invalider le cache de visibilité
	const tags = getFabInvalidationTags(key);
	tags.forEach((tag) => updateTag(tag));

	return { success: true, isHidden };
}
