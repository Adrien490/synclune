import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_NAMESPACE = "synclune-unsubscribe-token-v1";
const TOKEN_LENGTH_HEX = 32; // 16 bytes truncated from HMAC-SHA256

function getSigningSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret || secret.length < 32) {
		throw new Error("BETTER_AUTH_SECRET must be defined (≥32 chars) to sign unsubscribe tokens.");
	}
	return secret;
}

/**
 * Génère un token HMAC stateless prouvant que le porteur connaît l'email cible.
 *
 * Pourquoi pas d'expiration ? RFC 8058 §3.1 — un lien d'unsubscribe doit rester
 * valide indéfiniment (un user peut cliquer 2 ans après la réception).
 *
 * Pourquoi pas de scope (back-in-stock vs review) ? Désinscription = retrait
 * global du consentement marketing — persisté sur `User.marketingOptOutAt`
 * (RGPD-AUDIT P1-1), filtré par tous les émetteurs marketing.
 */
export function generateUnsubscribeToken(email: string): string {
	const payload = `${TOKEN_NAMESPACE}:${email.toLowerCase().trim()}`;
	return createHmac("sha256", getSigningSecret())
		.update(payload)
		.digest("hex")
		.slice(0, TOKEN_LENGTH_HEX);
}

export function verifyUnsubscribeToken(
	email: string | null | undefined,
	candidate: string | null | undefined,
): boolean {
	if (!email || !candidate || candidate.length !== TOKEN_LENGTH_HEX) return false;
	const expected = generateUnsubscribeToken(email);
	const expectedBuf = Buffer.from(expected, "hex");
	const candidateBuf = Buffer.from(candidate, "hex");
	if (expectedBuf.length !== candidateBuf.length) return false;
	return timingSafeEqual(expectedBuf, candidateBuf);
}
