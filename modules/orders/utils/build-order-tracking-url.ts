import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { generateOrderTrackingToken } from "./tracking-token";

/**
 * SSOT du lien « Suivre ma commande » envoyé aux clients (email de confirmation
 * webhook, `mark-as-paid`, `resend-order-email`).
 *
 * AUDIT-BIZ-001 — deux défauts corrigés en une seule surface :
 *  1. le chemin webhook construisait `${baseUrl}/orders`, une route inexistante
 *     (404 sur 100 % des commandes Stripe), alors que les deux chemins de
 *     rattrapage manuel utilisaient `/commandes/<orderNumber>` ;
 *  2. les commandes **invité** (`userId === null`) n'ont aucune surface de
 *     suivi : `/commandes` est dans `protectedRoutes` (`proxy.ts`) → un invité
 *     était renvoyé vers `/connexion` pour un compte qu'il n'a pas.
 *
 * Contrat :
 *  - client connecté → espace client `/commandes/<orderNumber>` (auth session) ;
 *  - invité → `/suivi-commande?commande=…&token=…` (HMAC sans état, namespace
 *    distinct de celui de la facture — cf. `tracking-token.ts`).
 *
 * Tout nouvel émetteur de `sendOrderConfirmationEmail` DOIT passer par ici :
 * la dérive entre émetteurs est verrouillée par
 * `modules/orders/utils/__tests__/order-tracking-url.regression.test.ts`.
 */
export function buildOrderTrackingUrl(order: {
	id: string;
	orderNumber: string;
	userId: string | null;
}): string {
	if (order.userId) {
		return buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));
	}

	const token = generateOrderTrackingToken(order.id, order.orderNumber);
	const params = new URLSearchParams({ commande: order.orderNumber, token });
	return buildUrl(`${ROUTES.SHOP.ORDER_TRACKING}?${params.toString()}`);
}
