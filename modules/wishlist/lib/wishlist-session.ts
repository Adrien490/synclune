import { cookies } from "next/headers";
import { WISHLIST_EXPIRATION_DAYS } from "@/modules/wishlist/constants/expiration.constants";

/**
 * Nom du cookie pour l'identifiant de session de la wishlist
 */
const WISHLIST_SESSION_COOKIE_NAME = "wishlist_session";

/**
 * Durée de vie du cookie : 30 jours, glissants — `getOrCreateWishlistSessionId()`
 * re-pose le cookie à chaque interaction wishlist pour rafraîchir son maxAge,
 * en cohérence avec la purge (`cleanup-wishlists.service.ts`, seuil sur
 * `Wishlist.updatedAt` = dernière interaction). Utilise WISHLIST_EXPIRATION_DAYS
 * pour cohérence avec la durée de rétention annoncée.
 */
const WISHLIST_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * WISHLIST_EXPIRATION_DAYS; // 30 jours en secondes

// Regex UUID v4 pour validation
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Récupère l'identifiant de session de la wishlist depuis les cookies
 * Valide que le sessionId est un UUID v4 valide (protection contre injection)
 * @returns L'identifiant de session ou null s'il n'existe pas ou est invalide
 */
export async function getWishlistSessionId(): Promise<string | null> {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(WISHLIST_SESSION_COOKIE_NAME)?.value;

	// Validation du format UUID v4
	if (!sessionId || !UUID_V4_REGEX.test(sessionId)) {
		return null;
	}

	return sessionId;
}

/**
 * Crée un nouvel identifiant de session et le stocke dans un cookie httpOnly
 * Utilise crypto.randomUUID() pour générer un UUID v4 cryptographiquement sécurisé
 * @returns Le nouvel identifiant de session créé
 */
export async function createWishlistSessionId(): Promise<string> {
	const sessionId = crypto.randomUUID(); // UUID v4 sécurisé (ex: 550e8400-e29b-41d4-a716-446655440000)
	await setWishlistSessionCookie(sessionId);
	return sessionId;
}

/**
 * Pose (ou re-pose) le cookie de session wishlist avec un maxAge complet.
 * Re-poser un cookie existant rafraîchit son expiration (glissante).
 */
async function setWishlistSessionCookie(sessionId: string): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.set(WISHLIST_SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true, // Pas accessible en JavaScript (protection XSS)
		secure: process.env.NODE_ENV === "production", // HTTPS en production uniquement
		sameSite: "lax", // Protection CSRF
		maxAge: WISHLIST_SESSION_COOKIE_MAX_AGE,
		path: "/",
	});
}

/**
 * Récupère l'identifiant de session existant ou en crée un nouveau
 *
 * Un cookie existant est re-posé avec la même valeur pour rafraîchir son
 * maxAge (expiration glissante, alignée sur `Wishlist.updatedAt` qui sert de
 * seuil à la purge). Sans cela, une invitée active > 30 jours perdait ses
 * favoris à J+30 pile après la création du cookie (audit wishlist 2026-08-01
 * — la JSDoc promettait le glissement, le code ne le faisait pas).
 *
 * @returns L'identifiant de session
 */
export async function getOrCreateWishlistSessionId(): Promise<string> {
	const existingSessionId = await getWishlistSessionId();

	if (existingSessionId) {
		await setWishlistSessionCookie(existingSessionId);
		return existingSessionId;
	}

	return await createWishlistSessionId();
}

// `clearWishlistSessionId` retiré (audit wishlist 2026-08-01) : son seul usage
// était la fusion post-login, supprimée avec l'espace client (2026-07-31).
