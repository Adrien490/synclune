"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { cookies } from "next/headers";

const COOKIE_NAME = "contact-adrien-hidden";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

/**
 * Server Action pour basculer la visibilité du bouton Contact Adrien
 * Stocke la préférence dans un cookie côté serveur
 * Requiert les droits administrateur
 */
export async function toggleContactAdrienVisibility(
	isHidden: boolean
): Promise<{ success: boolean; isHidden: boolean }> {
	const admin = await isAdmin();
	if (!admin) {
		throw new Error("Accès administrateur requis");
	}

	const cookieStore = await cookies();

	if (isHidden) {
		cookieStore.set(COOKIE_NAME, "true", {
			path: "/",
			maxAge: COOKIE_MAX_AGE,
			httpOnly: true,
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
		});
	} else {
		cookieStore.delete(COOKIE_NAME);
	}

	return { success: true, isHidden };
}
