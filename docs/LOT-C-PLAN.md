# Lot C — Plan d'exécution : Checkout Sessions (variante Elements) + `CheckoutReservation`

> Plan d'implémentation du **lot C de [`SIMPLIFICATION-V2.md`](SIMPLIFICATION-V2.md)**, rédigé le
> 2026-08-10 après relevé du flux actuel ([`CHECKOUT-FLOW-MAP-2026-08-10.md`](CHECKOUT-FLOW-MAP-2026-08-10.md))
> et vérification des pages Stripe qui gouvernent la variante. PR **isolée**, dernier lot du plan.
> Ce fichier est du matériau de travail : à supprimer à la livraison du lot.

## 0. Faits Stripe vérifiés (2026-08-10, docs.stripe.com)

- **`ui_mode: "elements"`** à la création de la Session — la page de paiement reste sur NOTRE
  domaine, avec nos composants. Côté React : imports depuis **`@stripe/react-stripe-js/checkout`**,
  **`CheckoutElementsProvider`** (prend `clientSecret` — string ou Promise), hook
  **`useCheckoutElements()`**, confirmation par **`checkout.confirm()`** (plus de
  `stripe.confirmPayment({ elements })`), email posé par `updateEmail` ou passé à `confirm`.
  Montants localisés lisibles depuis le hook (le total vit dans la Session côté Stripe).
- Le dépôt a déjà les bonnes majeures : `stripe@^22`, `@stripe/react-stripe-js@^6.8`,
  `@stripe/stripe-js@^9.12` (entrée `/checkout` disponible en v6).
- **`expires_at`** : 30 min à 24 h, **défaut 24 h**, **non modifiable** après création (seul
  `POST /v1/checkout/sessions/{id}/expire` force l'expiration). `checkout.session.expired` est
  l'event de restitution du stock — mais c'est un webhook, donc un filet applicatif reste dû (M3).
- **Update d'une Session** : `line_items` se retransmettent **en entier** (conserver = renvoyer
  l'`id` du line item, omettre = supprimer) ; `expires_at`, `mode`, `currency` non modifiables.
- `return_url: "…/paiement/retour?session_id={CHECKOUT_SESSION_ID}"` — le placeholder est
  substitué par Stripe.

## 1. Décisions de design (à valider en début d'exécution, puis figées)

### D1 — La commande naît PAYÉE ; `CheckoutReservation` remplace la commande PENDING

Aujourd'hui `confirmCheckout` crée une `Order` PENDING avant `confirmPayment`, et le webhook la
bascule PAID. Dans la cible :

- `createCheckoutSession` (nouvelle action) crée la Session Stripe **puis** la réservation DB
  (transaction avec `FOR UPDATE` sur les SKU — même requête que l'actuelle
  `order-creation.service.ts`, qui vérifie le stock **moins les réservations actives**), et
  seulement ensuite expose le `client_secret`. Séquence recommandée par la proposition et validée
  par l'audit (§ 9 « ce que la proposition a bien vu »).
- Le formulaire (adresse, email) alimente la Session (server action d'update) — la commande
  n'existe pas encore.
- `checkout.session.completed` (webhook) crée l'`Order` directement `PROCESSING`/`PAID` avec ses
  snapshots (depuis la réservation + la Session), décrémente le stock sous `FOR UPDATE`, et
  **supprime la réservation dans la même transaction** — « la suppression de la ligne EST le
  verrou d'idempotence », doublée par `Order.stripeCheckoutSessionId @unique` (P2002 = doublon).
- Conséquences assumées : plus de commandes PENDING abandonnées (la passe correspondante de
  `cleanup-pending-orders` s'éteint avec la dernière PENDING historique) ; M10 : l'export livre
  de recettes reste sur `paidAt`, désormais posé à la création.

### D2 — Réservation courte, filet applicatif sans cron

- `expires_at` de la Session ≈ **30 minutes** (plancher Stripe), via une SSOT
  `CHECKOUT_RESERVATION_TTL_MINUTES` — jamais le défaut de 24 h (un bijou unique invisible 24 h
  après un panier abandonné = la boutique qui se vide seule).
- **M3, option (a)** : le stock disponible se calcule `inventory − Σ réservations actives`
  (`expiresAt > now()`) — aucune dépendance à un cron (plafond Hobby) ni au webhook `expired`.
  Le webhook `checkout.session.expired` reste souscrit : il supprime la ligne éagrement (hygiène),
  mais rien ne casse s'il se perd — la réservation expirée est simplement ignorée par le filtre,
  et la purge des lignes mortes s'adosse à une passe existante (`cleanup-pending-orders`, sans
  réveil DB supplémentaire).

### D3 — Les frais de port restent calculés chez NOUS

Pas de `shipping_options` Stripe : la SSOT `calculateShipping` est conservée, le port est un
**line item dédié** de la Session (mis à jour par l'action d'update quand le pays/CP change —
`line_items` retransmis en entier). Motif : éviter la double source exacte que l'audit signale,
garder la logique Corse/DOM-TOM (`null` = zone non livrable) qui n'a pas d'équivalent
`shipping_options`, et garder l'affichage client actuel.

### D4 — La garde d'ownership change de porteur, pas de nature

`metadata.guestSessionId` (le cookie `cart_session`, nom gelé) se pose sur la **Checkout
Session** à la création ; toute action qui update/lit la Session re-vérifie `ownerMatch`
(CHECKOUT-IDOR-001 réécrit, pas supprimé). La garde de présence fail-closed change de sujet :
plus de `metadata.orderId` (la commande n'existe pas avant paiement) — le verrou devient le
`status` de la Session (`open` seul mutable) et l'existence d'une réservation.

### D5 — Périmètre client : remplacer la plomberie, garder les composants

Les 12 composants, `checkout-form`, sections, `pay-button`, summary restent. Changent :
`checkout-stripe-section.tsx` (`Elements` → `CheckoutElementsProvider`, la key structurelle sur
`clientSecret` garde son motif), `use-checkout-submit.ts` (`elements.submit()` +
`confirmCheckout` + `confirmPayment` → validation → `checkout.confirm()` ; `mapStripeErrorMessage`
et l'exception au tutoiement survivent), `use-payment-intent.ts` → `use-checkout-session.ts`
(init/re-init/update, le montant vit dans la Session), la page `retour` (décision sur
`session.status`/`payment_status` récupérés serveur — jamais un param client).

## 2. Schéma cible

```prisma
model CheckoutReservation {
  // PK naturelle : une Session Stripe = une réservation (cs_…).
  stripeCheckoutSessionId String   @id
  // Ownership invité (cookie cart_session) — garde CHECKOUT-IDOR-001, nouveau porteur.
  guestSessionId          String?  @db.VarChar(36)
  // Lignes réservées [{ skuId, quantity, priceInclTax }] — schéma Zod partagé
  // `checkoutReservationItemsSchema` (M8 : jamais un Json sans contrat).
  items                   Json
  // ≈ now() + CHECKOUT_RESERVATION_TTL_MINUTES (30 min, plancher Stripe).
  // Le stock disponible filtre expiresAt > now() : l'expiration est effective
  // sans webhook ni cron (M3 option a).
  expiresAt               DateTime
  createdAt               DateTime @default(now())

  // Purge des lignes mortes (passe adossée à cleanup-pending-orders) + calcul
  // du disponible par SKU (les items sont en Json : l'agrégat se fait en
  // mémoire sur les réservations actives, volume ~unités à ~20 cmd/mois).
  @@index([expiresAt])
}
```

Sur `Order` : `+ stripeCheckoutSessionId String? @unique` (verrou d'idempotence du fulfillment ;
`stripePaymentIntentId` RESTE — ancre des remboursements/litiges et des commandes historiques).

## 3. Phases d'exécution (une PR, commits séquencés)

1. **P1 — Socle** : modèle + migration (+ down.sql), `checkoutReservationItemsSchema` (Zod, parité
   longueurs), SSOT TTL, service `reservation-stock.service.ts` (disponible par SKU = inventory −
   réservations actives ; helpers purs testables), branchement du disponible dans
   `item-availability.service.ts` / `validateCartItemsWithDb` (ils prennent déjà le stock en
   entrée — point de moindre effort identifié au relevé).
2. **P2 — Actions serveur** : `create-checkout-session.ts` (remplace `initialize-payment`),
   `update-checkout-session.ts` (remplace `update-payment-amount` + la pose d'adresse/email de
   `confirm-checkout`), `expire-checkout-session.ts` (remplace `cancel-orphan-payment-intent`,
   via l'endpoint expire). `confirm-checkout.ts` disparaît (la confirmation est client :
   `checkout.confirm()`). Rate limits : mêmes presets, préfixes renommés. Gardes reprises :
   parité panier, prix, consentement montant (le total Session est recalculé serveur à chaque
   update — CHECKOUT-CONSENT-002 devient structurel), IDOR sur Session.
3. **P3 — Webhooks** : `checkout.session.completed` (fulfillment : création Order PAID +
   snapshots + décrément + suppression réservation, même transaction, advisory lock conservé)
   et `checkout.session.expired` (suppression réservation). Registre + types + 2 fixtures +
   contract tests. Les events `payment_intent.*` restent souscrits (remboursements, litiges,
   commandes historiques).
4. **P4 — Client** : `CheckoutElementsProvider`, `use-checkout-session.ts`, `checkout.confirm()`,
   page `retour` sur `session_id`. Les 3 specs e2e checkout adaptées (mêmes parcours, la page ne
   quitte jamais notre domaine).
5. **P5 — Périphérie** : `docs/stripe/INDEX.md` (les pages Checkout Sessions cessent d'être
   « délibérément exclues » ; `pnpm docs:stripe`), `cleanup-pending-orders` (passe réservations
   mortes), CLAUDE.md (§ panier/checkout, § webhooks), CHECKOUT-FLOW-MAP supprimée ou réécrite,
   SIMPLIFICATION-V2 statut. `pnpm validate` + e2e.

## 4. Ce qui ne change PAS (à re-vérifier en revue de PR)

Numérotation facture à l'encaissement (`ensureInvoiceNumberPersisted` déplacé dans le handler
`completed`), post-tasks (email de confirmation, invalidation), advisory lock `orderPaid`,
`clearCartAfterOrder` au montage de la confirmation, politique « pas de restock automatique »,
`cart_session` (nom, TTL), presets de rate limit non-checkout, `WebhookEvent` (lot E),
`mapStripeErrorMessage` + exception au tutoiement, plancher `STRIPE_MIN_AMOUNT_EUR_CENTS`.
