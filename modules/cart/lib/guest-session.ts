import { cookies } from "next/headers";
import { CART_EXPIRATION_DAYS } from "@/modules/cart/constants/expiration";
import { shouldUseSecureCookies } from "@/shared/lib/cookie-security";

/**
 * Identifiant de session INVITÉ.
 *
 * ⚠️ Ce n'est plus un pointeur vers un panier. Depuis le passage du panier en
 * cookie (2026-08-04), la table `Cart` n'existe plus et le contenu du panier vit
 * dans le cookie `cart` (`cart-cookie.ts`). Il reste deux usages, tous deux
 * réels :
 *
 *  1. **Garde d'ownership du PaymentIntent** (CHECKOUT-IDOR-001) —
 *     `initializePayment` écrit cet identifiant dans `metadata.guestSessionId` du
 *     PI, et `confirmCheckout` refuse tout `pi_…` dont le `guestSessionId` ne
 *     correspond pas au cookie de l'appelant. Sans lui, un invité pourrait lier
 *     sa commande au PaymentIntent d'un tiers.
 *  2. **Identité de rate limiting** — donne un compteur stable par visiteur aux
 *     actions panier et checkout, plus fin qu'une simple IP partagée.
 *
 * Le nom du cookie reste `cart_session` : le renommer invaliderait la garde
 * d'ownership de tout PaymentIntent créé avant le déploiement (le client
 * verrait « Accès non autorisé au paiement » en cliquant Payer), pour aucun gain
 * fonctionnel.
 */
const GUEST_SESSION_COOKIE_NAME = "cart_session";

// Regex UUID v4 pour validation
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valide qu'une chaîne respecte le format UUID v4 (canonique).
 */
function isValidGuestSessionId(value: string | null | undefined): value is string {
	return typeof value === "string" && UUID_V4_REGEX.test(value);
}

/**
 * Durée de vie du cookie : 7 jours, glissants — `getOrCreateGuestSessionId()`
 * re-pose le cookie à chaque interaction pour rafraîchir son maxAge, en
 * cohérence avec le cookie `cart` (lui aussi glissant sur 7 jours).
 */
const GUEST_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * CART_EXPIRATION_DAYS; // 7 jours en secondes

/**
 * Récupère l'identifiant de session invité depuis les cookies
 * @returns L'identifiant de session ou null s'il n'existe pas
 */
export async function getGuestSessionId(): Promise<string | null> {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value;

	if (!isValidGuestSessionId(sessionId)) {
		return null;
	}

	return sessionId;
}

/**
 * Pose (ou re-pose) le cookie de session invité avec un maxAge complet.
 * Re-poser un cookie existant rafraîchit son expiration (glissante).
 */
async function setGuestSessionCookie(sessionId: string): Promise<void> {
	const cookieStore = await cookies();

	cookieStore.set(GUEST_SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true, // Pas accessible en JavaScript (protection XSS)
		secure: shouldUseSecureCookies(), // SSOT — cf. shared/lib/cookie-security.ts
		sameSite: "lax", // Protection CSRF
		maxAge: GUEST_SESSION_COOKIE_MAX_AGE,
		path: "/",
	});
}

/**
 * Récupère l'identifiant de session existant ou en crée un nouveau
 *
 * Un cookie existant est re-posé avec la même valeur pour rafraîchir son maxAge
 * (expiration glissante). Sans cela, un invité actif > 7 jours perdrait la garde
 * d'ownership de son PaymentIntent en cours.
 *
 * Note: En cas d'appels concurrents (rare), deux sessions peuvent être créées.
 * C'est acceptable : chaque UUID est unique, le cookie sera écrasé, et plus
 * aucune ligne en base n'y est rattachée depuis le passage du panier en cookie.
 *
 * @returns L'identifiant de session
 */
export async function getOrCreateGuestSessionId(): Promise<string> {
	const existingSessionId = await getGuestSessionId();

	if (existingSessionId) {
		await setGuestSessionCookie(existingSessionId);
		return existingSessionId;
	}

	// UUID v4 cryptographiquement sécurisé (ex: 550e8400-e29b-41d4-a716-446655440000)
	const sessionId = crypto.randomUUID();
	await setGuestSessionCookie(sessionId);
	return sessionId;
}
