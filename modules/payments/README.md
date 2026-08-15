# modules/payments — Stripe Checkout hébergé (lot 3)

Le paiement passe par une session **Stripe Checkout hébergée** (décisions D4-D5 de
`docs/MIGRATION-PROMPTS.md`) : plus de page de paiement maison, plus d'Elements.

- `actions/create-checkout-session.ts` — lit le panier cookie, revalide en base,
  **réserve le stock** (décrément atomique) + crée l'Order PENDING avec snapshots
  dans une transaction, crée la session Stripe (`price_data` inline, eur), puis
  `redirect(session.url)`. Rollback compensatoire si Stripe échoue.
- `services/checkout-order.service.ts` — constructeurs purs (snapshots, montants,
  line items).
- `services/checkout-reservation.service.ts` — transaction de réservation et sa
  compensation.
- `components/` — formulaire de départ (`checkout-form`), vidage du panier au
  retour (`clear-cart-on-mount`), bloc « paiement en cours » avec polling borné
  et repli « vérifie tes emails » (`pending-confirmation`).

Les transitions PENDING→PAID / PENDING→CANCELLED vivent dans
`modules/webhooks/services/checkout-session-transitions.service.ts` (webhook +
réconciliation admin « Vérifier les commandes en attente »).

## Frontière payments ↔ orders — couplage bidirectionnel ASSUMÉ

Documenté à l'audit du 2026-08-15 (F9) plutôt que « corrigé » : les deux sens
sont légitimes et un déplacement préventif vers `shared/` n'aurait aujourd'hui
aucun troisième consommateur pour le justifier.

- **payments → orders** : `getShippingInfo` / `parseEstimatedDays` /
  `getShippingRate` (`orders/services/shipping.service.ts`) — le barème de
  livraison appartient au domaine commande, le checkout ne fait que le lire.
- **orders → payments** : `PENDING_SESSION_PLACEHOLDER_PREFIX` et
  `PENDING_ORDER_RECONCILE_AGE_HOURS` (`constants/checkout.constants.ts`) —
  l'annulation admin et la réconciliation doivent reconnaître les vestiges du
  checkout, la sémantique du placeholder vit donc ici, à sa source.

Si un troisième module a besoin du barème de livraison, c'est le signal pour
remonter `shipping.service` en `shared/` — pas avant.
