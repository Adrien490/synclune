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
	const cookieStore = await cookies();

	cookieStore.set(WISHLIST_SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true, // Pas accessible en JavaScript (protection XSS)
		secure: process.env.NODE_ENV === "production", // HTTPS en production uniquement
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
 * Utilise Date.now() pour éviter les problèmes de timezone
 * Utilise WISHLIST_EXPIRATION_MS pour cohérence avec le cleanup
 */
export function getWishlistExpirationDate(): Date {
	return new Date(Date.now() + WISHLIST_EXPIRATION_MS);
}
