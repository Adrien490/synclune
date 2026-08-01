import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { generateOrderTrackingToken } from "./tracking-token";

/**
 * SSOT du lien « Suivre ma commande » envoyé aux clients (email de confirmation
 * webhook, `mark-as-paid`, `resend-order-email`, emails d'annulation et de
 * remboursement).
 *
 * AUDIT-BIZ-001 — deux défauts corrigés en une seule surface :
 *  1. le chemin webhook construisait `${baseUrl}/orders`, une route inexistante
 *     (404 sur 100 % des commandes Stripe), alors que les deux chemins de
 *     rattrapage manuel utilisaient `/commandes/<orderNumber>` ;
 *  2. les commandes **invité** (`userId === null`) n'avaient aucune surface de
 *     suivi : `/commandes` était protégé → un invité était renvoyé vers
 *     `/connexion` pour un compte qu'il n'a pas.
 *
 * **Un seul contrat depuis le retrait de l'espace client (2026-07-31)** :
 * `/suivi-commande?commande=…&token=…`, authentifié par un HMAC sans état
 * (namespace distinct de celui de la facture — cf. `tracking-token.ts`).
 *
 * La branche « client connecté → `/commandes/<orderNumber>` » a disparu avec la
 * route. Ce n'était pas un simple nettoyage : `Order.userId` reste renseigné sur
 * les commandes passées AVANT le retrait, donc conserver le branchement aurait
 * envoyé leurs emails (annulation, remboursement, renvoi de confirmation) vers
 * une route supprimée — un 404 pour le client, sur le seul lien dont il dispose.
 *
 * Tout nouvel émetteur de `sendOrderConfirmationEmail` DOIT passer par ici :
 * la dérive entre émetteurs est verrouillée par
 * `modules/orders/utils/__tests__/order-tracking-url.regression.test.ts`.
 */
export function buildOrderTrackingUrl(order: { id: string; orderNumber: string }): string {
	const token = generateOrderTrackingToken(order.id, order.orderNumber);
	const params = new URLSearchParams({ commande: order.orderNumber, token });
	return buildUrl(`${ROUTES.SHOP.ORDER_TRACKING}?${params.toString()}`);
}
