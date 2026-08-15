import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton de session admin — valeur du cookie `admin_session`.
 *
 * Format : `<expiry>.<hmac>` où `expiry` est un timestamp epoch en millisecondes
 * et `hmac` le HMAC-SHA256 hex de `admin-session.v1:<expiry>`, signé avec
 * `AUTH_SECRET`.
 *
 * Le préfixe `admin-session.v1:` est une séparation de domaine : `AUTH_SECRET`
 * signe AUSSI les tokens de suivi de commande (`modules/orders/lib/
 * order-tracking-token.ts`, payload `orderId:email`). Sans lui, la non-confusion
 * des deux protocoles ne tenait qu'à la disjonction de FORMAT des payloads
 * (décimal pur vs présence d'un `:`) — vraie, mais verrouillée nulle part et
 * cassable par une évolution innocente de l'un des deux formats. Le préfixe la
 * rend structurelle. ⚠️ Son introduction (audit 2026-08-15) a invalidé les
 * cookies signés sous l'ancien schéma : une reconnexion, assumé.
 *
 * Fonctions PURES (le secret et l'horloge sont des arguments) : c'est ce qui les
 * rend testables sans mock de `cookies()` ni d'env. La lecture du cookie vit dans
 * `admin-session.ts`, la pose dans `actions/login.ts`.
 */

/** Entrée HMAC : le payload du cookie, préfixé du contexte de signature. */
function hmacInput(payload: string): string {
	return `admin-session.v1:${payload}`;
}

/** Signe un timestamp d'expiration. */
export function signSessionToken(expiresAtMs: number, secret: string): string {
	const payload = String(expiresAtMs);
	const hmac = createHmac("sha256", secret).update(hmacInput(payload)).digest("hex");
	return `${payload}.${hmac}`;
}

/**
 * Vérifie un jeton : signature (comparaison à temps constant) PUIS expiry.
 *
 * Retourne `false` pour tout jeton malformé, falsifié ou expiré — jamais
 * d'exception, un cookie est une entrée hostile.
 */
export function verifySessionToken(token: string, secret: string, nowMs: number): boolean {
	const dotIndex = token.indexOf(".");
	if (dotIndex <= 0) return false;

	const payload = token.slice(0, dotIndex);
	const providedHmac = token.slice(dotIndex + 1);

	// L'expiry doit être un entier décimal pur : `Number()` accepterait "1e13",
	// "0x…" ou " 42 ", autant de payloads qui ne re-signeraient pas à l'identique.
	if (!/^\d{1,15}$/.test(payload)) return false;

	const expectedHmac = createHmac("sha256", secret).update(hmacInput(payload)).digest("hex");

	// timingSafeEqual exige des buffers de même longueur — un HMAC hex fait 64
	// caractères, tout autre longueur est un jeton malformé.
	const providedBuffer = Buffer.from(providedHmac, "utf8");
	const expectedBuffer = Buffer.from(expectedHmac, "utf8");
	if (providedBuffer.length !== expectedBuffer.length) return false;
	if (!timingSafeEqual(providedBuffer, expectedBuffer)) return false;

	return Number(payload) > nowMs;
}
