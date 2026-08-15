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
  retour (`clear-cart-on-mount`), polling de confirmation (`confirmation-poller`).

Les transitions PENDING→PAID / PENDING→CANCELLED vivent dans
`modules/webhooks/services/checkout-session-transitions.service.ts` (webhook +
réconciliation admin « Vérifier les commandes en attente »).
