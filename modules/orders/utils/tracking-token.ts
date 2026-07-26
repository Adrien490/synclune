import { signOrderToken, verifyOrderToken } from "./order-token-signer";

/**
 * ⚠️ Namespace figé — tout changement invalide les liens de suivi déjà envoyés.
 */
const TOKEN_NAMESPACE = "synclune-order-tracking-token-v1";

/**
 * Token HMAC sans état ouvrant l'accès en **lecture seule** au suivi d'une
 * commande (`/suivi-commande?commande=…&token=…`).
 *
 * Raison d'être : le checkout invité est un chemin de premier ordre
 * (`confirm-checkout.ts` n'exige aucun compte), mais l'espace client
 * `/commandes` est derrière `protectedRoutes` (`proxy.ts`). Sans ce token, le
 * CTA « Suivre ma commande » de l'email de confirmation envoie un invité sur un
 * mur de connexion pour un compte qu'il n'a pas.
 *
 * Namespace distinct de `invoice-token.ts` : un lien de suivi ne doit pas
 * conférer l'accès au PDF de facture (surface PII plus large — identité de
 * facturation figée).
 */
export function generateOrderTrackingToken(orderId: string, orderNumber: string): string {
	return signOrderToken(TOKEN_NAMESPACE, orderId, orderNumber);
}

export function verifyOrderTrackingToken(
	orderId: string,
	orderNumber: string,
	candidate: string | null | undefined,
): boolean {
	return verifyOrderToken(TOKEN_NAMESPACE, orderId, orderNumber, candidate);
}
