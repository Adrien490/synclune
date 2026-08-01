import { cookies } from "next/headers";
import { CART_EXPIRATION_DAYS, CART_EXPIRATION_MS } from "@/modules/cart/constants/expiration";

/**
 * Nom du cookie pour l'identifiant de session du panier
 */
const CART_SESSION_COOKIE_NAME = "cart_session";

// Regex UUID v4 pour validation
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valide qu'une chaîne respecte le format UUID v4 (canonique).
 */
function isValidCartSessionId(value: string | null | undefined): value is string {
	return typeof value === "string" && UUID_V4_REGEX.test(value);
}

/**
 * Durée de vie du cookie : 7 jours, glissants — `getOrCreateCartSessionId()`
 * re-pose le cookie à chaque interaction panier pour rafraîchir son maxAge,
 * en cohérence avec `Cart.expiresAt` (lui aussi glissant, réécrit à chaque
 * mutation du panier). Utilise CART_EXPIRATION_DAYS pour cohérence.
 */
const CART_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * CART_EXPIRATION_DAYS; // 7 jours en secondes

/**
 * Récupère l'identifiant de session du panier depuis les cookies
 * @returns L'identifiant de session ou null s'il n'existe pas
 */
export async function getCartSessionId(): Promise<string | null> {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(CART_SESSION_COOKIE_NAME)?.value;

	if (!isValidCartSessionId(sessionId)) {
		return null;
	}

	return sessionId;
}

/**
 * Crée un nouvel identifiant de session et le stocke dans un cookie httpOnly
 * Utilise crypto.randomUUID() pour générer un UUID v4 cryptographiquement sécurisé
 * @returns Le nouvel identifiant de session créé
 */
export async function createCartSessionId(): Promise<string> {
	const sessionId = crypto.randomUUID(); // UUID v4 sécurisé (ex: 550e8400-e29b-41d4-a716-446655440000)
	await setCartSessionCookie(sessionId);
	return sessionId;
}

/**
 * Pose (ou re-pose) le cookie de session panier avec un maxAge complet.
 * Re-poser un cookie existant rafraîchit son expiration (glissante).
 */
async function setCartSessionCookie(sessionId: string): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.set(CART_SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true, // Pas accessible en JavaScript (protection XSS)
		secure: process.env.NODE_ENV === "production", // HTTPS uniquement en production
		sameSite: "lax", // Protection CSRF
		maxAge: CART_SESSION_COOKIE_MAX_AGE,
		path: "/",
	});
}

/**
 * Récupère l'identifiant de session existant ou en crée un nouveau
 *
 * Un cookie existant est re-posé avec la même valeur pour rafraîchir son
 * maxAge (expiration glissante, alignée sur `Cart.expiresAt` qui est réécrit
 * à chaque mutation du panier). Sans cela, un invité actif > 7 jours perdrait
 * son cookie alors que son panier DB est encore valide.
 *
 * Note: En cas d'appels concurrents (rare), deux sessions peuvent être créées.
 * C'est acceptable car chaque UUID est unique et le cookie sera écrasé.
 * Le panier orphelin sera purgé par la passe paniers du cron
 * `cleanup-pending-orders` (cleanup-carts.service.ts).
 *
 * @returns L'identifiant de session
 */
export async function getOrCreateCartSessionId(): Promise<string> {
	const existingSessionId = await getCartSessionId();

	if (existingSessionId) {
		await setCartSessionCookie(existingSessionId);
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
 * Calcule la date d'expiration pour un panier visiteur (7 jours glissants,
 * réécrite à chaque mutation du panier). Les paniers expirés sont ignorés à
 * la lecture, puis purgés (après grâce) par la passe paniers du cron
 * `cleanup-pending-orders`.
 */
export function getCartExpirationDate(): Date {
	const now = new Date();
	return new Date(now.getTime() + CART_EXPIRATION_MS);
}
