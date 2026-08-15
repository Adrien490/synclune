import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token du suivi de commande invité — SEUL accès client à une commande.
 *
 * `token = HMAC-SHA256(orderId + ":" + email minuscule)`, signé avec
 * `AUTH_SECRET` (même secret que la session admin — en prod il reprend la
 * valeur de l'ex-`BETTER_AUTH_SECRET` pour ne pas invalider les liens déjà
 * emailés, cf. état du lot 1). Sans expiration : un lien de suivi doit rester
 * valable toute la vie de la commande.
 *
 * Fonctions PURES (secret en argument) — c'est ce qui les rend testables ;
 * les liaisons env vivent dans `buildOrderTrackingUrl` / la page.
 */

function trackingPayload(orderId: string, email: string): string {
	return `${orderId}:${email.trim().toLowerCase()}`;
}

export function signOrderTrackingToken(orderId: string, email: string, secret: string): string {
	return createHmac("sha256", secret).update(trackingPayload(orderId, email)).digest("hex");
}

export function verifyOrderTrackingToken(
	token: string,
	orderId: string,
	email: string,
	secret: string,
): boolean {
	// 64 hex chars — refuse tôt les formats aberrants sans toucher au HMAC.
	if (!/^[0-9a-f]{64}$/.test(token)) return false;
	const expected = signOrderTrackingToken(orderId, email, secret);
	const a = Buffer.from(token, "utf8");
	const b = Buffer.from(expected, "utf8");
	// timingSafeEqual exige la même longueur (garantie par le test de format).
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
