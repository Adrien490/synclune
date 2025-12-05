import { cookies } from "next/headers";
import { WISHLIST_EXPIRATION_DAYS, WISHLIST_EXPIRATION_MS } from "@/modules/wishlist/constants/expiration.constants";

/**
 * Nom du cookie pour l'identifiant de session de la wishlist
 */
const WISHLIST_SESSION_COOKIE_NAME = "wishlist_session";

/**
 * Durée de vie du cookie : 30 jours
 * Cette durée est réinitialisée à chaque interaction avec la wishlist
 * Utilise WISHLIST_EXPIRATION_DAYS pour cohérence avec la durée de vie de la wishlist
 */
const WISHLIST_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * WISHLIST_EXPIRATION_DAYS; // 30 jours en secondes

/**
 * Récupère l'identifiant de session de la wishlist depuis les cookies
 * @returns L'identifiant de session ou null s'il n'existe pas
 */
export async function getWishlistSessionId(): Promise<string | null> {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(WISHLIST_SESSION_COOKIE_NAME)?.value;
	return sessionId || null;
}

/**
 * Crée un nouvel identifiant de session et le stocke dans un cookie httpOnly
 * Utilise crypto.randomUUID() pour générer un UUID v4 cryptographiquement sécurisé
 * @returns Le nouvel identifiant de session créé
 */
export async function createWishlistSessionId(): Promise<string> {
	const sessionId = crypto.randomUUID(); // UUID v4 sécurisé (ex: 550e8400-e29b-41d4-a716-446655440000)
	const cookieStore = await cookies();

	cookieStore.set(WISHLIST_SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true, // Pas accessible en JavaScript (protection XSS)
		secure: process.env.NODE_ENV === "production", // HTTPS uniquement en production
		sameSite: "lax", // Protection CSRF
		maxAge: WISHLIST_SESSION_COOKIE_MAX_AGE,
		path: "/",
	});

	return sessionId;
}

/**
 * Récupère l'identifiant de session existant ou en crée un nouveau
 * @returns L'identifiant de session
 */
export async function getOrCreateWishlistSessionId(): Promise<string> {
	const existingSessionId = await getWishlistSessionId();

	if (existingSessionId) {
		return existingSessionId;
	}

	return await createWishlistSessionId();
}

/**
 * Supprime le cookie de session de la wishlist
 * Utilisé lors de la connexion d'un utilisateur pour fusionner sa wishlist visiteur
 */
export async function clearWishlistSessionId(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(WISHLIST_SESSION_COOKIE_NAME);
}

/**
 * Calcule la date d'expiration pour une wishlist visiteur (30 jours)
 * Utilise WISHLIST_EXPIRATION_MS pour cohérence avec le cleanup
 */
export function getWishlistExpirationDate(): Date {
	const now = new Date();
	return new Date(now.getTime() + WISHLIST_EXPIRATION_MS);
}
