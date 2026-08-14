import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Primitif de signature partagé par tous les tokens d'accès commande stateless
 * (facture — `invoice-token.ts` — et suivi de commande — `tracking-token.ts`).
 *
 * Extrait pour que chaque usage ait son propre **namespace** : un lien de suivi
 * ne doit pas conférer l'accès au PDF de facture, et inversement. Les deux
 * dérivent du même secret mais produisent des tokens disjoints.
 *
 * ⚠️ Ne JAMAIS modifier un namespace existant : les tokens sont sans état, déjà
 * distribués par email, et doivent rester valides pendant toute la durée de vie
 * de la commande (10 ans pour la facture, Art. L102 B LPF). Un changement de
 * namespace invalide silencieusement tous les liens déjà envoyés.
 */
const TOKEN_LENGTH_HEX = 32; // 16 bytes truncated from HMAC-SHA256

function getSigningSecret(): string {
	const secret = process.env.AUTH_SECRET;
	if (!secret || secret.length < 32) {
		throw new Error("AUTH_SECRET must be defined (≥32 chars) to sign order access tokens.");
	}
	return secret;
}

/**
 * Dérive un token d'accès de `namespace + orderId + orderNumber`. Pas
 * d'expiration : la commande reste consultable pour la durée de vie utile du
 * lien (l'`orderNumber` porte déjà 48 bits d'entropie CSPRNG, cf.
 * `generateOrderNumber`, donc le couple est non énumérable).
 */
export function signOrderToken(namespace: string, orderId: string, orderNumber: string): string {
	const payload = `${namespace}:${orderId}:${orderNumber}`;
	return createHmac("sha256", getSigningSecret())
		.update(payload)
		.digest("hex")
		.slice(0, TOKEN_LENGTH_HEX);
}

/**
 * Comparaison à temps constant du token candidat. Fail-closed sur toute forme
 * inattendue (longueur, non-hex) avant `timingSafeEqual`, qui throw sur des
 * buffers de tailles différentes.
 */
export function verifyOrderToken(
	namespace: string,
	orderId: string,
	orderNumber: string,
	candidate: string | null | undefined,
): boolean {
	if (!candidate || candidate.length !== TOKEN_LENGTH_HEX) return false;
	const expected = signOrderToken(namespace, orderId, orderNumber);
	const expectedBuf = Buffer.from(expected, "hex");
	const candidateBuf = Buffer.from(candidate, "hex");
	if (expectedBuf.length !== candidateBuf.length) return false;
	return timingSafeEqual(expectedBuf, candidateBuf);
}
