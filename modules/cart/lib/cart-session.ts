import { cookies } from "next/headers";
import { CART_EXPIRATION_DAYS, CART_EXPIRATION_MS } from "@/modules/cart/constants/expiration";

/**
 * Nom du cookie pour l'identifiant de session du panier
 */
const CART_SESSION_COOKIE_NAME = "cart_session";

/**
 * Durée de vie du cookie : 7 jours
 * Cette durée est réinitialisée à chaque interaction avec le panier
 * Utilise CART_EXPIRATION_DAYS pour cohérence avec la durée de vie du panier
 */
const CART_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * CART_EXPIRATION_DAYS; // 7 jours en secondes

/**
 * Récupère l'identifiant de session du panier depuis les cookies
 * @returns L'identifiant de session ou null s'il n'existe pas
 */
export async function getCartSessionId(): Promise<string | null> {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(CART_SESSION_COOKIE_NAME)?.value;
	return sessionId || null;
}

/**
 * Crée un nouvel identifiant de session et le stocke dans un cookie httpOnly
 * Utilise crypto.randomUUID() pour générer un UUID v4 cryptographiquement sécurisé
 * @returns Le nouvel identifiant de session créé
 */
export async function createCartSessionId(): Promise<string> {
	const sessionId = crypto.randomUUID(); // UUID v4 sécurisé (ex: 550e8400-e29b-41d4-a716-446655440000)
	const cookieStore = await cookies();

	cookieStore.set(CART_SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true, // Pas accessible en JavaScript (protection XSS)
		secure: process.env.NODE_ENV === "production", // HTTPS uniquement en production
		sameSite: "lax", // Protection CSRF
		maxAge: CART_SESSION_COOKIE_MAX_AGE,
		path: "/",
	});

	return sessionId;
}

/**
 * Récupère l'identifiant de session existant ou en crée un nouveau
 *
 * Note: En cas d'appels concurrents (rare), deux sessions peuvent être créées.
 * C'est acceptable car chaque UUID est unique et le cookie sera écrasé.
 * Le panier orphelin sera nettoyé par le cron job d'expiration.
 *
 * @returns L'identifiant de session
 */
export async function getOrCreateCartSessionId(): Promise<string> {
	const existingSessionId = await getCartSessionId();

	if (existingSessionId) {
		return existingSessionId;
	}

	return await createCartSessionId();
}

/**
 * Supprime le cookie de session du panier
 * Utilisé lors de la connexion d'un utilisateur pour fusionner son panier visiteur
 */
export async function clearCartSessionId(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(CART_SESSION_COOKIE_NAME);
}

/**
 * Calcule la date d'expiration pour un panier visiteur (7 jours)
 * Utilise CART_EXPIRATION_MS pour cohérence avec le cleanup
 */
export function getCartExpirationDate(): Date {
	const now = new Date();
	return new Date(now.getTime() + CART_EXPIRATION_MS);
}
