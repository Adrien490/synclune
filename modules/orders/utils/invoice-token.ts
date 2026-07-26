import { signOrderToken, verifyOrderToken } from "./order-token-signer";

/**
 * ⚠️ Namespace figé — tout changement invalide les liens facture déjà envoyés
 * par email (conservation 10 ans, Art. L102 B LPF).
 */
const TOKEN_NAMESPACE = "synclune-invoice-token-v1";

/**
 * Generates a stateless HMAC token granting access to an Order's invoice PDF
 * for the lifetime of the order (no expiration — invoices remain accessible
 * for the 10-year fiscal retention window). The token is derived from a stable
 * namespace + orderId + orderNumber, so it does not change on rotation of
 * unrelated fields.
 *
 * Used for guest checkouts where `Order.userId` is null and the customer has
 * no session to authenticate against. The token is delivered in the order
 * confirmation email and required as `?token=` query param on the invoice
 * route.
 *
 * Ne confère PAS l'accès à la page de suivi de commande : celle-ci a son propre
 * namespace (`tracking-token.ts`).
 */
export function generateInvoiceAccessToken(orderId: string, orderNumber: string): string {
	return signOrderToken(TOKEN_NAMESPACE, orderId, orderNumber);
}

export function verifyInvoiceAccessToken(
	orderId: string,
	orderNumber: string,
	candidate: string | null | undefined,
): boolean {
	return verifyOrderToken(TOKEN_NAMESPACE, orderId, orderNumber, candidate);
}
