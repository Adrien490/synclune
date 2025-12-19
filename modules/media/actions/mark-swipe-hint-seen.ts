"use server";

import { cookies } from "next/headers";
import {
	SWIPE_HINT_COOKIE_NAME,
	SWIPE_HINT_COOKIE_MAX_AGE,
} from "../constants/swipe-hint";

/**
 * Marque l'indicateur de swipe comme vu
 * Stocke la préférence dans un cookie côté serveur
 */
export async function markSwipeHintSeen(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set(SWIPE_HINT_COOKIE_NAME, "true", {
		path: "/",
		maxAge: SWIPE_HINT_COOKIE_MAX_AGE,
		httpOnly: true,
		sameSite: "strict",
		secure: process.env.NODE_ENV === "production",
	});
}
