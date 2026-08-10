# Cartographie du flux checkout — état AVANT le lot C (2026-08-10)

> Référence « avant travaux » du **lot C de [`SIMPLIFICATION-V2.md`](SIMPLIFICATION-V2.md)**
> (PaymentIntent + Elements → Checkout Session en variante Elements + `CheckoutReservation`).
> Relevé produit le 2026-08-10 sur le dépôt à jour du lot E ; les numéros de ligne datent de ce
> relevé et ne sont pas gardés par un test — se fier aux noms de fichiers et de symboles.
> À SUPPRIMER (ou requalifier en doc du nouveau flux) quand le lot C sera livré.

Flow réel : **PaymentIntents + Elements, card-only, zéro Checkout Session** (confirmé par
`docs/stripe/INDEX.md` et le commentaire du registre d'events).

---

## 1. Les 4 actions de paiement (`modules/payments/actions/`) — celles que le lot C remplace

### `initialize-payment.ts`

`initializePayment(params: unknown)` → `{ success, clientSecret, paymentIntentId, subtotal, shipping, total, boundAmount }`.

Étapes : parse Zod **en tête** → session → rate limit (`buildPaymentRateLimitId("checkout-init", …)`, preset `PAYMENT_LIMITS.CREATE_SESSION` 15/h) → `requireActiveAccountIfAuthenticated()` → `assertStoreOpen()` sauf admin vérifié → **CHECKOUT-CART-PARITY-001** (`getCart()` + `cartMatchesServerCart`) → `getSkuDetails` par ligne (existence/soft-delete/actif/PUBLIC, ne lit pas `inventory`) → **CHECKOUT-STOCK-GATE-001** (`validateCartItemsWithDb`, garde de courtoisie cachée, aucun verrou) → contrôle prix `priceAtAdd === sku.priceInclTax` → `subtotal` + `calculateShipping("FR")` → `getOrCreateStripeCustomer` → clé d'idempotence `buildIdempotencyKey("pi-init", [ownerKey, customerKey, total, cartHash])` (`ownerKey = userId ?? sessionId`, refus si nul) → `stripe.paymentIntents.create({ amount, currency: "eur", payment_method_types: ["card"], metadata: { userId: userId ?? "guest", guestSessionId? } })` sous circuit breaker → **CHECKOUT-REPLAY-001** (PI terminal rendu par le replay idempotent → re-création clé salée `-r2`) → réhydratation `boundAmount` depuis `order.findUnique({ stripePaymentIntentId })` si `paymentStatus === "PENDING"`.

Écritures : Stripe seulement (PI + customer). Base : aucune. Cookie : pose/rafraîchit `cart_session`.

### `confirm-checkout.ts` (852 l.)

`confirmCheckout(data: unknown)` → `{ success, orderId, orderNumber, finalAmount, addressSaved? }`.

Parse **en tête** (la clé de rate limit dérive de l'email parsé — `checkout-validate-before-rate-limit.regression.test.ts`) → gates (compte ACTIVE, store open, rate limit `checkout-confirm`) → **idempotence** `order.findUnique({ stripePaymentIntentId })` → `resolveIdempotentHit` (3 gardes : empreinte des lignes + destination ; consentement `wouldOvercharge` ; correction d'adresse KI-001 répercutée, avec push `receipt_email` sur le PI) → **CHECKOUT-IDOR-001** : `paymentIntents.retrieve`, garde de présence **fail-closed** sur `pi.metadata.orderId` BRUTE, puis `parsePaymentIntentMetadata` (Zod fail-open par champ) et `ownerMatch` (`userId` ou `sessionId === guestSessionId`) → refus PI terminal → parité panier → re-validation dispo + prix (sans stock : l'autorité est le `FOR UPDATE` d'après) → `computeCartSubtotal` → `createOrderInTransaction` (catch `P2002` → re-fetch → `resolveIdempotentHit`, CHECKOUT-IDEM-002) → **CHECKOUT-CONSENT-002** (`order.total > displayedTotal` → cleanup + refus) → `paymentIntents.update({ amount: order.total, receipt_email, shipping, metadata: { orderId, orderNumber, … } })` avec course terminale reconnue (`payment_intent_unexpected_state`) → `after(enrichStripeCustomer)`. Pas de vidage de panier (délibéré — carte refusée doit pouvoir réessayer).

Advisory lock : `cleanupFailedCheckout` = pre-check `paymentStatus === "PAID"` puis tx `acquireOrderPaidLockTx` + re-check sous verrou (`TX_TIMEOUT_LONG`/`TX_MAX_WAIT_LONG`).

### `update-payment-amount.ts`

`{ paymentIntentId, country, postalCode }` → recalcule côté serveur (panier + `calculateShipping(country, postalCode)`) et pousse `paymentIntents.update({ amount })`. Gardes : rate limit `update-amount` (20/5 min) ; présence brute `metadata.orderId` (« Commande déjà initiée ») ; ownership IDOR ; **CHECKOUT-PI-STATE-001** (`AMOUNT_MUTABLE_PI_STATUSES`) ; **garde TOCTOU** (second `retrieve` juste avant l'update). ⚠️ Parse APRÈS le rate limit ici (contrairement aux deux autres). Aucune écriture DB. `newTotal = max(STRIPE_MIN_AMOUNT_EUR_CENTS, …)`, update sauté si `shippingUnavailable`.

### `cancel-orphan-payment-intent.ts`

Fire-and-forget, **no-op silencieux** sur tout refus (ne divulgue pas l'état d'un PI tiers). Parse avant le `try` → identité → rate limit `cancel-orphan` (20/5 min) → `retrieve` → garde présence `metadata.orderId` → `ownerMatch` → `paymentIntents.cancel`. Appelant : `use-payment-intent.ts` quand un re-init post-inactivité rend un PI différent.

### Socle commun

- Identité rate limit : `modules/payments/utils/payment-rate-limit-id.ts` — `user:<id>` → `guest:<email>:<ip>` → `session:<uuid>` → `ip:` → `anonymous`. Le préfixe par action est PORTEUR.
- Presets : `shared/lib/rate-limit-config.ts` (`checkout-create-session` 15/h partagé init+confirm, `payment-update-amount`, `payment-cancel-orphan`).
- Metadata PI : `modules/payments/schemas/stripe-metadata.schema.ts` — `looseObject`, `userId` (`"guest" | cuid2`) et `guestSessionId` (uuidv4) stricts ; `parsePaymentIntentMetadata` fail-open par champ, « jamais pour une garde de présence ».
- Schémas : `modules/payments/schemas/checkout.schema.ts` (`cartItemsSchema` min 1 / max `MAX_CART_ITEMS` / `skuId` uniques ; `confirmCheckoutSchema` avec `displayedTotal`).

---

## 2. `order-creation.service.ts` — la transaction de création

Pré-tx : **CHECKOUT-TOTAL-005** (subtotal recalculé = subtotal annoncé) ; `generateOrderNumber()` ; `calculateShipping` (`null` → refus Corse/DOM-TOM) ; rejet explicite `total < STRIPE_MIN_AMOUNT_EUR_CENTS` (pas de clamp — MIN-AMOUNT-DIVERGE-01).

Tx (`TX_TIMEOUT_LONG`) : **une seule requête** `SELECT … FROM "ProductSku" ps JOIN "Product" p … WHERE ps.id = ANY($ids) FOR UPDATE OF ps` (`OF ps` pour ne pas verrouiller Product ; requête alignée sur celle du webhook pour éviter l'entrelacement d'ordre de verrouillage) → gardes par ligne sous verrou (existence, soft-delete, actif+PUBLIC, **`inventory < quantity` → « Stock insuffisant »**, prix sous verrou) → `order.create` (snapshot dénormalisé : 10 colonnes adresse/client + `stripePaymentIntentId` obligatoire, NF 525) → `orderItem.create` par ligne (snapshots titre/image via `pickPrimaryImage`, labels tronqués 100 c.).

**Rien ne décrémente ici** — réservation optimiste : le décrément unique vit dans le webhook. Deux checkouts concurrents sur le dernier exemplaaire passent tous deux ; le perdant est arrêté au webhook (`OversellError` → auto-refund ORD-STRIPE-009). Pas d'`OrderHistory` à la création (la 1ʳᵉ entrée est la transition PAID).

> Point d'insertion naturel de `CheckoutReservation` : cette transaction tient déjà les bonnes lignes verrouillées et ne fait rien du verrou au-delà de la lecture.

---

## 3. Webhook `payment_intent.succeeded`

### Route (`app/api/webhooks/stripe/route.ts`, maxDuration 60)

Signature (`constructEvent`) → anti-replay 300 s SDK → **idempotence `WebhookEvent`** (PK `stripeEventId` depuis le lot E) : pré-check `findUnique` ; fraîcheur d'un PROCESSING sur `processingStartedAt` (WEBHOOK-AUDIT-002, seuil `STALE_PROCESSING_THRESHOLD_MS`) ; court-circuit COMPLETED/SKIPPED/PROCESSING-frais → duplicate ; **IDEM-ROUTE-001** : `create` (catch P2002 → 200 duplicate) sinon claim optimiste `updateMany` conditionné `status`+`attempts`. Gardes annexes : `livemode`, dérive de version d'API (alerte, jamais de rejet), rate limit avant signature. `dispatchEvent` **awaité** (le 200 part après le traitement) ; post-tasks via `after()`.

### Handler `handlePaymentSuccess` (`payment-handlers.ts`)

`resolveOrderId(metadata)` (`orderId ?? order_id`) → fallback ORD-STRIPE-005 (`order.findFirst({ stripePaymentIntentId })`) → **encaissement orphelin ORD-STRIPE-010** (ni metadata ni PI en base → `refunds.create` idempotent `orphan-refund-<pi>` + alerte, skip) → `extractPaymentDetailsFromPaymentIntent` (un seul `charges.retrieve`) → `processOrderFromPaymentIntent` → sur-facturation persistée idempotente (`overbilledAmountCents`, alerte, pas d'avoir auto) → `ensureInvoiceNumberPersisted` (Art. 289-I) → `buildPostCheckoutTasksFromPI`. Catchs typés : `OversellError` → `handleOversell`, `AmountMismatchError` → `handleAmountMismatch`, `CancelledOrderRaceError` → skip 200 ; autre → alerte + rethrow (retry Stripe).

### Fulfillment `processOrderAtomically` (`checkout-order-processing.service.ts`)

`acquireOrderPaidLockTx` (advisory `4_000_000_000 + hashtext(orderId)`, disjoint des locks facture/avoir) **avant** le fetch → **idempotence `paymentStatus === "PAID"` → return early** → garde devise → sous-facturation → `AmountMismatchError` → `SELECT … FOR UPDATE` des SKU → agrégation par SKU (CHECKOUT-BOUNDS-001) → re-validation (échec → `OversellError` avant tout décrément) → **`inventory: { decrement }`** (LE décrément) → `order.update({ status: PROCESSING, paymentStatus: PAID, paidAt: capture Stripe })` → audit `OrderAction.PAID` (1ʳᵉ entrée) → désactivation des SKU à 0 sauf dernier actif d'un produit PUBLIC (STOCK-LAST-ACTIVE-SKU-001). Le panier n'est PAS vidé ici (cookie invisible au webhook) → `clearCartAfterOrder` sur `/paiement/confirmation`.

### Post-tasks (`checkout-post-tasks.service.ts`)

`INVALIDATE_CACHE` (`getOrderInvalidationTags` + `collectStockInvalidationTags`) et `ORDER_CONFIRMATION_EMAIL` — destinataire **`paymentIntent.receipt_email ?? order.customerEmail` (le PI gagne)**, tracking + facture par tokens HMAC, `idempotencyKey: order-confirm-<id>` (Resend 24 h). Exécution isolée par tâche dans `execute-post-webhook-tasks.service.ts` (plus de file durable).

---

## 4. Frais de port

SSOT en deux fichiers : `modules/orders/constants/shipping-rates.ts` (`SHIPPING_RATES = { FR: 499 ¢ "2-4 jours ouvrés", EU: 950 ¢ "5-8 jours ouvrés" }`, Monaco = EU, **aucun franco de port**, `PREPARATION_BUSINESS_DAYS = [2, 4]`) et `modules/orders/services/shipping.service.ts` (`calculateShipping(country, postalCode?) : number | null` — SSOT du montant, `null` = zone non livrable via `UNSHIPPABLE_ZONES` Corse/DOM/TOM ; `getShippingInfo` pour l'affichage ; sans code postal on AUTORISE). Zones : `shipping-zone.service.ts`.

Appelants : `initialize-payment` (provisoire FR), `update-payment-amount` (recalcul saisie), `order-creation.service` (**montant autoritaire** d'`Order.shippingCost`), `checkout-form.tsx` (affichage client, même SSOT).

> Lot C : une Checkout Session veut des `shipping_options` déclarées chez Stripe — la double
> source à trancher explicitement (cf. § Lot C du doc d'audit).

---

## 5. Séquence côté client

Page RSC `app/paiement/page.tsx` : `getCart()` + `getSession()` → `validateCart()` → `<CheckoutForm>`.

Les 12 composants de `modules/payments/components/` : `checkout-form.tsx` (racine ; `usePaymentIntent`, état `lockedAmount` + réhydratation `boundAmount`, `getFormData()` calcule `displayedTotal`), `checkout-form-body.tsx` (`useEffectEvent syncStripeAmount` ; lazy-load Stripe `next/dynamic ssr:false`), `checkout-section.tsx` (coque, 4 accents), `checkout-contact-section.tsx`, `checkout-address-fields.tsx` (**`lockDestination`** gèle pays+CP quand montant verrouillé), `shipping-method-section.tsx`, `checkout-stripe-section.tsx` (**`<Elements key={clientSecret}>`** — la key est structurelle, `elements-client-secret-remount.regression.test.ts`), `pay-button.tsx` (`amountToPay = lockedAmount ?? total`, publie `--pay-bar-height`), `checkout-summary.tsx`, `checkout-error-summary.tsx` (ancre a11y), `payment-section-skeleton.tsx`, `stripe-wordmark.tsx`.

`client_secret` : ne quitte JAMAIS le client vers nos serveurs — seul `paymentIntentId` circule en retour.

`use-payment-intent.ts` : init unique ; **re-init après onglet caché > 10 min** (`STALE_THRESHOLD_MS`) avec `cancelOrphanPaymentIntent` de l'ancien PI si différent ; `updateAmount` débouncé 500 ms (le client n'envoie jamais de montant) ; `cancelPendingUpdate()` dès que la commande est liée.

`use-checkout-submit.ts` : gardes stripe/elements → `getFormData` → **`elements.submit()` AVANT `confirmCheckout`** (structurel : évite une PENDING orpheline par saisie de carte fautive) → `confirmCheckout` → `onOrderBound(finalAmount)` → `allowNavigation()` → `stripe.confirmPayment({ return_url: /paiement/retour?order_id=… })`. `mapStripeErrorMessage` (module-privé) : `card_error`/`validation_error` → message Stripe fr (vouvoyé, exception allowlistée), sinon générique tutoyé.

Retour : `app/paiement/retour/page.tsx` — décision sur `pi.status` **serveur** uniquement (jamais `redirect_status`), `withStripeDeadline(5000)` ; `succeeded` → confirmation ; `processing|requires_action` → confirmation `&pending=true` (CARDONLY-01). Confirmation : `cart-cleaner.tsx` → `clearCartAfterOrder()` + `pending-payment-watcher.tsx`.

---

## 6. `cart_session` (`modules/cart/lib/guest-session.ts`)

Cookie `cart_session` (nom **gelé** — le renommer invaliderait la garde d'ownership de tout PI antérieur au déploiement), UUID v4 strict, httpOnly/lax, 7 j glissants, re-posé à chaque lecture. Plus un pointeur de panier (le contenu vit dans le cookie `cart`). **2 usages** : garde d'ownership du PI (`metadata.guestSessionId`, CHECKOUT-IDOR-001) et identité de rate limiting. Interdit dans un scope `"use cache"` (`cache-scoping.regression.test.ts`).

> Lot C : la garde d'ownership change de porteur (la Checkout Session), elle ne disparaît pas.

---

## 7. Registre d'events Stripe (`modules/webhooks/utils/event-registry.ts`)

11 events routés : `payment_intent.{succeeded,payment_failed,canceled,processing}`, `charge.refunded`, `refund.{created,updated,failed}`, `charge.refund.updated` (alias legacy), `charge.dispute.{created,closed}`. **Aucun `checkout.session.*`**.

Ajouter un event : (1) littéral dans `SupportedStripeEvent` (`webhook.types.ts`) ; (2) entrée du `Record` strict `eventHandlers` (oubli non compilable) ; (3) handler retournant `WebhookHandlerResult` + tâches dans l'union `PostWebhookTask` ; (4) fixture `test/fixtures/stripe/<type>.json` (contract test complétude + `api_version`) ; (5) souscription Dashboard + version épinglée ; (6) tableau de `docs/stripe/INDEX.md` (contract test du mirror).

---

## 8. Stock — où brancher un filtre « réservations actives »

- **Aucun modèle de réservation n'existe** ; chaque site lit `ProductSku.inventory` brut (~20 sites).
- Lectures panier/checkout : `fetchSkuForValidation` / `fetchSkusForBatchValidation` (`get-sku-for-validation.ts`) et `fetchCartSkus` (`get-cart.ts`) sont sous **`"use cache"` `cacheLife("checkout")`** — une soustraction de réservations calculée DANS ces scopes serait servie périmée, et cookies/session y sont interdits. Chemins frais : `readCartWithSkus` (non caché) et les lectures directes d'`add-to-cart` / `update-cart-item`.
- **Point de moindre effort côté gardes** : les prédicats purs d'`item-availability.service.ts` et la boucle de `validateCartItemsWithDb` prennent le stock en ENTRÉE — leur passer un `availableInventory` couvre panier + validate-cart + les gardes de courtoisie d'un geste.
- **Points autoritaires** : les deux `FOR UPDATE` (création de commande ; fulfillment webhook) devront verrouiller AUSSI les réservations (ou partager l'advisory lock) ; le `FOR UPDATE OF ps` exclut délibérément `Product`, une jointure devra étendre la clause `OF` explicitement.
- **Cycle de vie** : le webhook ne voit aucun cookie — la libération d'une réservation à l'encaissement se fait par `orderId`/session Stripe, jamais par cookie. Porteurs d'identité disponibles : `cart_session` (7 j) et `Order.stripePaymentIntentId @unique` (→ `Order.stripeCheckoutSessionId @unique` au lot C).

Vitrine/catalogue : les 5 selects de `product.constants.ts` sélectionnent `inventory` ; filtres SQL stock dans `product-query-builder.ts` ; `isSoldOut` (`product-availability.service.ts`) ; `product-display.service.ts` (`inStock`, `displayedInventory`).

---

## 9. Tests qui verrouillent ce flux (inventaire au 2026-08-10)

- **Actions** : `modules/payments/actions/__tests__/` (4 suites + `checkout-validate-before-rate-limit.regression`).
- **Services** : `order-creation.service{,.integration}`, `order-snapshot-column-parity.regression`, `cart-parity`, `checkout-subtotal`, `stripe-customer`, `map-stripe-payment-method`.
- **Schémas/utils** : `checkout.schema`, `checkout-schema-ids`, `checkout-cart-items-bounds.regression`, `stripe-metadata-schema.regression`, `payment-rate-limit-id.regression`, `statement-descriptor`, `checkout-voice-tutoiement.regression` (allowliste `mapStripeErrorMessage`).
- **Hooks/composants** : `use-checkout-submit`, `use-payment-intent`, `use-checkout-form` ; 9 suites composants + régressions dont `elements-client-secret-remount`, `checkout-locked-amount-rehydration`, `locked-amount-address-editable`, `checkout-validation-timing`, `checkout-stripe-lazy`.
- **Webhooks** : `payment-handlers`, `oversell-loser-auto-refund.regression`, `amount-mismatch-auto-refund.regression`, `checkout-order-processing.integration`, `checkout-order-processing.cancelled-race.regression`, `checkout-pi-flow`, `payment-intent-idempotency`, `duplicate-sku-stock-aggregation.regression`, `last-active-sku-not-deactivated.regression`, `payment-intent-succeeded-replay.integration`, `out-of-order-events.integration`, route (`route.test`, `webhook-concurrency.regression`, `webhook-api-version-drift.regression`).
- **Contrats** : `stripe-events` (12 fixtures), `stripe-docs-mirror`, `server-action-input-validation`, `transactional-writes-schema-validity`, `zod-prisma-length-parity`, `schema-migration-parity`, `cache-invalidation-context`.
- **Panier/port/session** : `guest-session` (verrouille le nom `cart_session`), `sku-validation.service`, `item-availability.service`, `sku-validation-cache-profile.regression`, `shipping.service`, `shipping-min-amount-invariant`, `cache-scoping.regression`.
- **Pages tunnel** : `checkout-return-decision`, `checkout-return-timeout.regression`, `checkout-confirmation-a11y.regression`, `pending-payment-watcher`, etc.
- **E2E** : `checkout.spec.ts`, `checkout-flow.spec.ts`, `checkout-accessibility.spec.ts` (les 3 specs « checkout » du lot C), `payment-failure-flow`, `async-payment-flow`, `keyboard-purchase-flow`, `user-journey`.
