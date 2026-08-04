# Documentation Stripe — index et correspondance avec le code

Ce dossier contient un **mirror ciblé** de la documentation officielle Stripe : 64 pages
récupérées en markdown brut depuis `docs.stripe.com`, groupées en 6 bundles.

```bash
pnpm docs:stripe
```

**Seul ce fichier est versionné.** Les bundles (`01-*.md` … `06-*.md`, ~1,7 Mo) sont
gitignorés : la doc Stripe bouge en continu, un mirror commité serait périmé et
polluerait chaque diff. Ils sont aussi dans `.prettierignore` — sans ça,
`pnpm format:check`, donc `pnpm validate`, parcourt 1,7 Mo de markdown qu'on ne
maîtrise pas et rougit.

Le manifeste (quelle page va dans quel bundle) vit **en dur dans
`scripts/fetch-stripe-docs.ts`** : c'est la SSOT.

---

## Ce que Synclune utilise réellement de Stripe

C'est ce périmètre, et lui seul, qui détermine le contenu du mirror.

|                       |                                                                      |
| --------------------- | -------------------------------------------------------------------- |
| SDK serveur           | `stripe@22.3.2`                                                      |
| SDK client            | `@stripe/stripe-js@9.12.0`, `@stripe/react-stripe-js@6.8.0`          |
| Version d'API         | **`2026-06-24.dahlia`**, épinglée (`shared/lib/stripe.ts`)           |
| Flow de paiement      | **PaymentIntents + Elements**, card-only. **Zéro Checkout Session.** |
| Méthodes SDK appelées | 11                                                                   |
| Events webhook routés | 12                                                                   |
| Facturation           | PDF maison (jspdf) — **pas** Stripe Invoicing                        |
| Remboursements        | **Stripe-first** : émis depuis le Dashboard, ingérés par webhook     |

### Les 11 méthodes SDK appelées

| Méthode                        | Appelant principal                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `paymentIntents.create`        | `modules/payments/actions/initialize-payment.ts`                                                         |
| `paymentIntents.retrieve`      | `app/paiement/retour/page.tsx`, `confirm-checkout.ts`, `sync-async-payments.service.ts`                  |
| `paymentIntents.update`        | `confirm-checkout.ts`, `update-payment-amount.ts`                                                        |
| `paymentIntents.cancel`        | `cancel-orphan-payment-intent.ts`, `mark-as-paid.ts`, `sync-async-payments.service.ts`                   |
| `refunds.create`               | `modules/webhooks/services/payment-intent.service.ts` (`initiateAutomaticRefund`), `payment-handlers.ts` |
| `refunds.retrieve`             | `modules/cron/services/reconcile-refunds.service.ts`                                                     |
| `customers.create` / `.update` | `modules/payments/services/stripe-customer.service.ts`                                                   |
| `charges.retrieve`             | `modules/payments/services/map-stripe-payment-method.ts`                                                 |
| `events.retrieve`              | `modules/cron/services/retry-webhooks.service.ts` (rejeu DLQ)                                            |
| `webhooks.constructEvent`      | `app/api/webhooks/stripe/route.ts`                                                                       |
| `balance.retrieve`             | `app/api/health/route.ts` (ping de connectivité)                                                         |

### Les 12 events webhook routés

Registry unique : `modules/webhooks/utils/event-registry.ts`. Chaque event a sa fixture
dans `test/fixtures/stripe/` et son assertion de routing dans
`test/contract/stripe-events.test.ts`.

| Event                                                                                               | Handler                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------ |
| `payment_intent.succeeded` · `.payment_failed` · `.canceled` · `.processing`                        | `handlers/payment-handlers.ts` |
| `invoice.payment_failed`                                                                            | `handlers/payment-handlers.ts` |
| `charge.refunded` · `refund.created` · `refund.updated` · `charge.refund.updated` · `refund.failed` | `handlers/refund-handlers.ts`  |
| `charge.dispute.created` · `charge.dispute.closed`                                                  | `handlers/dispute-handlers.ts` |

`charge.refund.updated` est l'alias legacy de `refund.updated`, routé volontairement
au même handler pour ne pas dépendre de la version d'API souscrite par l'endpoint.

---

## Correspondance page Stripe → code Synclune

La partie qui ne s'obtient nulle part ailleurs : quelle page de doc éclaire quel site du repo.

| Page Stripe                                              | Bundle | Site Synclune                                                                                                                                                                        |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `payments/payment-intents`, `api/payment_intents/create` | 01     | `modules/payments/actions/initialize-payment.ts` — `payment_method_types: ["card"]`                                                                                                  |
| `api/idempotent_requests`                                | 03     | 4 familles de clés, cf. tableau ci-dessous                                                                                                                                           |
| `payments/payment-intents/verifying-status`              | 01     | `app/paiement/retour/page.tsx` — décide sur `pi.status`, **jamais** sur `redirect_status` (manipulable)                                                                              |
| `payments/payment-intents/asynchronous-capture`          | 01     | `modules/cron/services/sync-async-payments.service.ts` — `payment_intent.payment_failed` est **non-terminal**, c'est ce cron qui acte l'échec                                        |
| `payments/3d-secure/authentication-flow`                 | 01     | `processing` / `requires_action` = 3DS en settlement (card-only, pas de SEPA/Klarna)                                                                                                 |
| `declines/codes`                                         | 01     | `mapStripeErrorMessage` dans `modules/payments/hooks/use-checkout-submit.ts`                                                                                                         |
| `payments/payment-element`                               | 02     | `modules/payments/components/checkout-stripe-section.tsx` — `<Elements key={clientSecret}>` (remontage forcé, régression documentée)                                                 |
| `js/payment_intents/confirm_payment`                     | 02     | `modules/payments/hooks/use-checkout-submit.ts` — `elements.submit()` puis `stripe.confirmPayment`                                                                                   |
| `webhooks/signature`                                     | 03     | `app/api/webhooks/stripe/route.ts` — les 4 couches anti-replay sont documentées en tête du fichier                                                                                   |
| `api/events/types`                                       | 03     | `modules/webhooks/utils/event-registry.ts`                                                                                                                                           |
| `webhooks/process-undelivered-events`                    | 03     | `modules/cron/services/retry-webhooks.service.ts` (tâche **manuelle**, page Maintenance)                                                                                             |
| `refunds`, `api/refunds/object`                          | 04     | Ingestion Dashboard : `modules/webhooks/services/refund.service.ts` (`syncStripeRefunds`, upsert par `stripeRefundId`)                                                               |
| `disputes/responding`                                    | 04     | **Pas de modèle `Dispute`** — l'état est dérivé d'`OrderHistory` par `modules/orders/services/has-open-dispute.service.ts`                                                           |
| `api/charges/object`                                     | 04     | `modules/payments/services/map-stripe-payment-method.ts` — `card.wallet.type` → `WALLET` / `LINK` (exigence arrêté 2022-1299 §4.3)                                                   |
| `cli/trigger`                                            | 05     | `test/fixtures/stripe/README.md` — régénération des 12 fixtures                                                                                                                      |
| `api/versioning`, `changelog/dahlia`                     | 06     | `shared/lib/stripe.ts` — et ⚠️ `app/api/health/route.ts` **réécrit la version en dur** (drift à surveiller)                                                                          |
| `rate-limits`                                            | 06     | Distinct de notre rate limit applicatif : `STRIPE_WEBHOOK_LIMIT` (1000/min) dans `shared/lib/rate-limit-config.ts`, appliqué **avant** la vérification de signature (anti-CPU-drain) |

### Clés d'idempotence Stripe en circulation

| Clé                                                       | Émetteur                                                                                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pi-init-${ownerKey}-${customerKey}-${total}-${cartHash}` | `initialize-payment.ts` — tous les paramètres mutables du `create` sont dans la clé, sinon Stripe rejette. Suffixe `-r2` si le replay 24 h rend un PI terminal. |
| `customer-create-${email}`                                | `stripe-customer.service.ts` — **seul** mécanisme de dédupe client (checkout 100 % invité)                                                                      |
| `auto-refund-${paymentIntentId}`                          | `payment-intent.service.ts` (`initiateAutomaticRefund`)                                                                                                         |
| `orphan-refund-${paymentIntentId}`                        | `payment-handlers.ts` — encaissement sans commande                                                                                                              |

---

## Ce qui est délibérément exclu

L'index officiel `docs.stripe.com/llms.txt` compte **481 pages**. On en garde 64.
Les ~417 autres couvrent des produits qui n'ont **aucun appelant** dans le repo :

**Connect** · **Issuing** · **Terminal** · **Treasury** · **Capital** · **Crypto** ·
**Climate** · **Sigma** · **Atlas** · **Radar** · **Identity** · **Financial Connections** ·
**Revenue Recognition** · **Tax** · **Billing** (abonnements) · **Payment Links**

Deux exclusions méritent une justification, parce qu'on pourrait croire le contraire :

- **Checkout Sessions** (40 pages) — Synclune n'en crée **jamais**. Le tunnel est
  PaymentIntents + Elements. Les events `checkout.session.*` ont été retirés du registry.
- **Invoicing** (35 pages) — les factures et avoirs sont générés en interne (jspdf,
  numérotation séquentielle gap-free, archivage UploadThing + SHA-256). Stripe Invoicing
  n'est pas utilisé. Cf. les invariants de facturation électronique dans `CLAUDE.md`.

Les tirer tous ferait ~10 Mo pour ~0 usage.

## ⚠️ Ne pas régénérer le manifeste depuis `llms.txt`

`llms.txt` est **curé, et lacunaire précisément sur notre périmètre**. Sa section
« Elements » ne liste que du mobile et l'Address Element : `payments/payment-element` —
le composant web réellement monté — **n'y figure pas**. Manquent aussi
`api/idempotent_requests`, `disputes/*`, `payments/3d-secure/*` et `changelog/dahlia`.

Un filtre par section aurait raté l'essentiel. D'où un manifeste écrit à la main,
chaque page vérifiée en HTTP 200.

Corollaire pour le script : **une 404 de `docs.stripe.com` renvoie un corps de ~24 Ko**,
pas un corps vide. `fetch-stripe-docs.ts` rejette sur `!res.ok` et n'écrit rien si une
seule page manque — sinon la page d'erreur se noierait dans un bundle de 860 Ko. Un
échec signale qu'une page a été déplacée côté Stripe : corriger le manifeste.

---

## Les 6 bundles

| Fichier                  | Pages | Taille | Couvre                                                                                                                                       |
| ------------------------ | ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-payments.md`         | 19    | 862 Ko | PaymentIntents, `accept-a-payment`, statuts, capture asynchrone, 3DS, codes de refus, API PaymentIntents/PaymentMethods                      |
| `02-elements.md`         | 11    | 86 Ko  | Payment Element web, collecte des coordonnées, `stripe.js` (init, création d'Element, `confirmPayment`), Link, wallets                       |
| `03-webhooks.md`         | 8     | 170 Ko | Réception, signature, quickstart, events non délivrés, destinations, types d'events, requêtes idempotentes                                   |
| `04-refunds-disputes.md` | 9     | 243 Ko | Remboursements (guide + API), litiges (réponse, mesure), objets Dispute et Charge                                                            |
| `05-testing.md`          | 6     | 164 Ko | Cartes de test, Stripe CLI, `stripe trigger`, checklist de mise en production, environnement de dev                                          |
| `06-api-versioning.md`   | 11    | 148 Ko | Montées de version, versioning, **changelog `dahlia`**, erreurs, rate limits, metadata, expansion, pagination, devises, guide sécurité, SDKs |

## Sources complémentaires dans le repo

- `CLAUDE.md` — invariants métier (facturation électronique, anti-replay, cache, panier cookie)
- `docs/RUNBOOK.md` — procédures opérationnelles, encaissement hors Stripe (`mark-as-paid`)
- `test/fixtures/stripe/README.md` — régénération des fixtures webhook
- `.claude/skills/stripe-integration/SKILL.md` — patterns du repo (non versionné)
