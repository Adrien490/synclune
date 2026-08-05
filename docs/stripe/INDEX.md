# Documentation Stripe — index et correspondance avec le code

Ce dossier contient un **mirror ciblé** de la documentation officielle Stripe : 68 pages
récupérées en markdown brut depuis `docs.stripe.com`, groupées en 6 bundles.

```bash
pnpm docs:stripe
```

**Seul ce fichier est versionné.** Les bundles (`01-*.md` … `06-*.md`, ~1,9 Mo) sont
gitignorés : la doc Stripe bouge en continu, un mirror commité serait périmé et
polluerait chaque diff. Ils sont aussi dans `.prettierignore` — sans ça,
`pnpm format:check`, donc `pnpm validate`, parcourt 1,9 Mo de markdown qu'on ne
maîtrise pas et rougit.

Le manifeste (quelle page va dans quel bundle) vit **en dur dans
`scripts/fetch-stripe-docs.ts`** : c'est la SSOT.

---

## Ce que Synclune utilise réellement de Stripe

C'est ce périmètre, et lui seul, qui détermine le contenu du mirror.

|                       |                                                                        |
| --------------------- | ---------------------------------------------------------------------- |
| SDK serveur           | `stripe@22.3.2`                                                        |
| SDK client            | `@stripe/stripe-js@9.12.0`, `@stripe/react-stripe-js@6.8.0`            |
| Version d'API         | **`2026-06-24.dahlia`**, SSOT `shared/constants/stripe-api-version.ts` |
| Flow de paiement      | **PaymentIntents + Elements**, card-only. **Zéro Checkout Session.**   |
| Méthodes SDK appelées | 12                                                                     |
| Events webhook routés | 12                                                                     |
| Facturation           | PDF maison (jspdf) — **pas** Stripe Invoicing                          |
| Remboursements        | **Stripe-first** : émis depuis le Dashboard, ingérés par webhook       |

### Les 12 méthodes SDK appelées

| Méthode                                  | Appelant principal                                                                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paymentIntents.create`                  | `modules/payments/actions/initialize-payment.ts`                                                                                                            |
| `paymentIntents.retrieve`                | `app/paiement/retour/page.tsx`, `confirm-checkout.ts`, `sync-async-payments.service.ts`                                                                     |
| `paymentIntents.update`                  | `confirm-checkout.ts`, `update-payment-amount.ts`                                                                                                           |
| `paymentIntents.cancel`                  | `cancel-orphan-payment-intent.ts`, `mark-as-paid.ts`, `sync-async-payments.service.ts`                                                                      |
| `refunds.create`                         | `modules/webhooks/services/payment-intent.service.ts` (`initiateAutomaticRefund`), `payment-handlers.ts`                                                    |
| `refunds.retrieve`                       | `modules/cron/services/reconcile-refunds.service.ts`                                                                                                        |
| `refunds.list`                           | `modules/webhooks/services/refund.service.ts` — `.autoPagingToArray()` quand `charge.refunds.has_more` (le payload du webhook plafonne à 10 remboursements) |
| `customers.create` / `.update` / `.list` | `modules/payments/services/stripe-customer.service.ts` — `.list({ email })` dédupe au-delà des 24 h de la clé d'idempotence                                 |
| `charges.retrieve`                       | `modules/payments/services/map-stripe-payment-method.ts`                                                                                                    |
| `webhooks.constructEvent`                | `app/api/webhooks/stripe/route.ts`                                                                                                                          |
| `balance.retrieve`                       | `app/api/health/route.ts` (ping de connectivité)                                                                                                            |

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

### ⏳ Montée de version en attente — `2026-07-29.dahlia`

Stripe a publié `2026-07-29.dahlia`, livrée par `stripe@22.4.0`. **Son changelog est déjà
dans `06-api-versioning.md`** : le mirror fait son travail, encore faut-il le lire.

Innocuité vérifiée le 2026-08-05 : les 5 entrées _breaking_ portent sur Checkout Sessions,
les métadonnées sectorielles `taxes`, Connect, Treasury et les shared payment tokens —
**aucune n'a d'appelant ici** (grep à blanc). Ce qui nous touche est additif : détails
client / moyen de paiement sur `Refund`, réseau de carte sur `Dispute`, résultat 3DS
« Data Share Only ».

**Pourquoi ce n'est pas fait** : `pnpm-workspace.yaml` impose `minimumReleaseAge: 10080`
(7 jours de quarantaine supply-chain). `stripe@22.4.0` devient installable le
**2026-07-30 23:38 UTC + 7 j**, `@stripe/stripe-js@9.13.0` le **2026-08-11**. L'échappatoire
`--config.minimumReleaseAge=0` est réservée au patch de sécurité urgent — ce bump n'en est
pas un, et le forcer viserait la dépendance la plus sensible du dépôt.

**Le bump est ATOMIQUE**, `Stripe.LatestApiVersion` étant un littéral unique et non une
union — bumper le SDK sans la constante (ou l'inverse) casse `tsc` :

1. `pnpm add stripe@22.4.0` ;
2. `STRIPE_API_VERSION` → `"2026-07-29.dahlia"` ;
3. les 12 `test/fixtures/stripe/*.json` (`api_version`) — deux tests l'assertent ;
4. cette section et le tableau ci-dessus.

---

## Correspondance page Stripe → code Synclune

La partie qui ne s'obtient nulle part ailleurs : quelle page de doc éclaire quel site du repo.

| Page Stripe                                              | Bundle | Site Synclune                                                                                                                                                                                                                                        |
| -------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments/payment-intents`, `api/payment_intents/create` | 01     | `modules/payments/actions/initialize-payment.ts` — `payment_method_types: ["card"]`                                                                                                                                                                  |
| `api/idempotent_requests`                                | 03     | 4 familles de clés, cf. tableau ci-dessous                                                                                                                                                                                                           |
| `payments/payment-intents/verifying-status`              | 01     | `app/paiement/retour/page.tsx` — décide sur `pi.status`, **jamais** sur `redirect_status` (manipulable)                                                                                                                                              |
| `payments/payment-intents/asynchronous-capture`          | 01     | `modules/cron/services/sync-async-payments.service.ts` — `payment_intent.payment_failed` est **non-terminal**, c'est ce cron qui acte l'échec                                                                                                        |
| `payments/3d-secure/authentication-flow`                 | 01     | `processing` / `requires_action` = 3DS en settlement (card-only, pas de SEPA/Klarna)                                                                                                                                                                 |
| `declines/codes`                                         | 01     | `mapStripeErrorMessage` dans `modules/payments/hooks/use-checkout-submit.ts`                                                                                                                                                                         |
| `payments/payment-element`                               | 02     | `modules/payments/components/checkout-stripe-section.tsx` — `<Elements key={clientSecret}>` (remontage forcé, régression documentée)                                                                                                                 |
| `js/payment_intents/confirm_payment`                     | 02     | `modules/payments/hooks/use-checkout-submit.ts` — `elements.submit()` puis `stripe.confirmPayment`                                                                                                                                                   |
| `js/elements_object`                                     | 02     | La **seule** doc d'`elements.submit()` (étape 2/4 de `use-checkout-submit.ts`) : la valider **avant** de confirmer, et **attendre sa promesse**. Il n'existe pas de page dédiée — `js/elements_object/submit` est une 404                            |
| `elements/appearance-api`                                | 02     | `modules/payments/constants/stripe-appearance.ts` (thème + variables + 5 sélecteurs de règles, doublés dark) et `hooks/use-stripe-appearance.ts`. ⚠️ Stripe **ignore silencieusement** un sélecteur inconnu : c'est la seule référence de leurs noms |
| `webhooks/signature`                                     | 03     | `app/api/webhooks/stripe/route.ts` — les 4 couches anti-replay sont documentées en tête du fichier                                                                                                                                                   |
| `api/events/types`                                       | 03     | `modules/webhooks/utils/event-registry.ts`                                                                                                                                                                                                           |
| `webhooks/process-undelivered-events`                    | 03     | **Plus aucun site** — `retry-webhooks` a été retiré le 2026-08-05 (KI-006). La route renvoie 500, Stripe redélivre seul 3 jours ; au-delà, le rejeu se fait au Dashboard.                                                                            |
| `refunds`, `api/refunds/object`                          | 04     | Ingestion Dashboard : `modules/webhooks/services/refund.service.ts` (`syncStripeRefunds`, upsert par `stripeRefundId`)                                                                                                                               |
| `disputes/responding`                                    | 04     | **Pas de modèle `Dispute`** — l'état est dérivé d'`OrderHistory` par `modules/orders/services/has-open-dispute.service.ts`                                                                                                                           |
| `api/charges/object`                                     | 04     | `modules/payments/services/map-stripe-payment-method.ts` — `card.wallet.type` → `WALLET`/`LINK` (arrêté 2022-1299 §4.3) et `created` → `Order.paidAt` (date d'encaissement, Art. 50-0 CGI)                                                           |
| `api/customers/list`, `api/customers/search`             | 01     | `stripe-customer.service.ts` — `list` et **pas** `search` : ce dernier s'exclut lui-même des flux read-after-write. ⚠️ Le filtre `email` de `list` est **case-sensitive**                                                                            |
| `cli/trigger`                                            | 05     | `test/fixtures/stripe/README.md` — régénération des 12 fixtures                                                                                                                                                                                      |
| `api/versioning`, `changelog/dahlia`                     | 06     | SSOT `shared/constants/stripe-api-version.ts`, consommée par `shared/lib/stripe.ts` **et** `app/api/health/route.ts` (qui instancie son propre client, d'où la constante à part)                                                                     |
| `rate-limits`                                            | 06     | Distinct de notre rate limit applicatif : `STRIPE_WEBHOOK_LIMIT` (1000/min) dans `shared/lib/rate-limit-config.ts`, appliqué **avant** la vérification de signature (anti-CPU-drain)                                                                 |

### Clés d'idempotence Stripe en circulation

| Clé                                                       | Émetteur                                                                                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pi-init-${ownerKey}-${customerKey}-${total}-${cartHash}` | `initialize-payment.ts` — tous les paramètres mutables du `create` sont dans la clé, sinon Stripe rejette. Suffixe `-r2` si le replay 24 h rend un PI terminal. |
| `customer-create-v2-<sha256(email)>`                      | `stripe-customer.service.ts` — dédupe les requêtes **concurrentes** ; la fenêtre longue est couverte par `customers.list({ email })`, la clé expirant à 24 h    |
| `auto-refund-${paymentIntentId}`                          | `payment-intent.service.ts` (`initiateAutomaticRefund`)                                                                                                         |
| `orphan-refund-${paymentIntentId}`                        | `payment-handlers.ts` — encaissement sans commande                                                                                                              |

---

## Ce qui est délibérément exclu

L'index officiel `docs.stripe.com/llms.txt` compte **481 pages**. On en garde 68.
Les ~413 autres couvrent des produits qui n'ont **aucun appelant** dans le repo :

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

**À l'inverse, trois pages sont gardées SANS appelant actuel** — vérifié le 2026-08-05, et
noté ici pour qu'on ne les « redécouvre » pas comme mortes : `elements/address-element` et
`payments/advanced/collect-addresses` (aucun `AddressElement` monté — mais elles décrivent
la collecte que `pay-button.tsx` fait à la main via `billing_details`) et
`payments/place-a-hold-on-a-payment-method` (aucun `capture_method` au dépôt — c'est la
page à lire le jour où une précommande imposerait une autorisation différée).

## ⚠️ Ne pas régénérer le manifeste depuis `llms.txt`

`llms.txt` est **curé, et lacunaire précisément sur notre périmètre**. Sa section
« Elements » ne liste que du mobile et l'Address Element : `payments/payment-element` —
le composant web réellement monté — **n'y figure pas**. Manquent aussi
`api/idempotent_requests`, `disputes/*`, `payments/3d-secure/*` et `changelog/dahlia`.

Un filtre par section aurait raté l'essentiel. D'où un manifeste écrit à la main,
chaque page vérifiée en HTTP 200.

Corollaire pour le script : **une 404 de `docs.stripe.com` renvoie un corps de ~24 Ko**,
pas un corps vide. `fetch-stripe-docs.ts` rejette sur `!res.ok` et n'écrit rien si une
seule page manque — sinon la page d'erreur se noierait dans un bundle de 940 Ko. Un
échec signale qu'une page a été déplacée côté Stripe : corriger le manifeste.

## ⚠️ Une 200 ne veut pas dire du contenu — le piège des pages à variantes

Stripe décline certaines pages par intégration ou par langage. **L'URL nue rend alors un
sommaire de ~500 o**, pas la doc :

> This article has multiple variants. Fetch one of the following URLs…

C'est le symétrique du piège 404, en plus vicieux : rien ne le signale. L'audit du
2026-08-05 en a trouvé **quatre** au mirror, dont `payments/accept-a-payment` — la page
d'intégration de référence du tunnel — stockée en 1053 o là où sa variante en fait 77 695.
Soit ~110 Ko de doc absents, invisibles à la lecture d'un bundle de 860 Ko.

Une entrée de manifeste peut donc porter une query, et le script **refuse** désormais une
page-sommaire en listant les variantes disponibles :

| Page                                  | Variante retenue                                      |
| ------------------------------------- | ----------------------------------------------------- |
| `payments/accept-a-payment`           | `?payment-ui=elements&api-integration=paymentintents` |
| `payments/advanced/collect-addresses` | `?payment-ui=elements`                                |
| `testing/wallets`                     | `?ui=payment-element`                                 |
| `get-started/development-environment` | `?lang=node`                                          |
| `elements/appearance-api`             | `?api-integration=paymentintents`                     |

⚠️ **La variante Elements + PaymentIntents d'`accept-a-payment` s'ouvre en recommandant
les Checkout Sessions** (« N'utilisez pas l'API Payment Intents, sauf si l'utilisateur le
demande explicitement »). C'est la recommandation générique de Stripe, pas un constat sur
Synclune : le choix PaymentIntents est délibéré et documenté ci-dessus. Ne pas lire ce
paragraphe comme une consigne.

## La locale est épinglée

Le script force `?locale=fr-FR`. Sans ce paramètre, Stripe négocie la langue sur la **géo
de l'appelant** : le mirror a été généré en français depuis la France, un run CI ou
derrière un VPN l'aurait rendu en anglais — 1,9 Mo de diff pour zéro changement de
contenu. L'idempotence annoncée par le script n'était vraie que sur une seule machine.

---

## Les 6 bundles

| Fichier                  | Pages | Taille | Couvre                                                                                                                                                         |
| ------------------------ | ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-payments.md`         | 21    | 944 Ko | PaymentIntents, `accept-a-payment`, statuts, capture asynchrone, 3DS, codes de refus, API PaymentIntents/PaymentMethods/Customers                              |
| `02-elements.md`         | 13    | 261 Ko | Payment Element web, **API Appearance**, collecte des coordonnées, `stripe.js` (init, **objet Elements**, création d'Element, `confirmPayment`), Link, wallets |
| `03-webhooks.md`         | 8     | 167 Ko | Réception, signature, quickstart, events non délivrés, destinations, types d'events, requêtes idempotentes                                                     |
| `04-refunds-disputes.md` | 9     | 243 Ko | Remboursements (guide + API), litiges (réponse, mesure), objets Dispute et Charge                                                                              |
| `05-testing.md`          | 6     | 188 Ko | Cartes de test, Stripe CLI, `stripe trigger`, checklist de mise en production, environnement de dev                                                            |
| `06-api-versioning.md`   | 11    | 149 Ko | Montées de version, versioning, **changelog `dahlia`**, erreurs, rate limits, metadata, expansion, pagination, devises, guide sécurité, SDKs                   |

## Sources complémentaires dans le repo

- `CLAUDE.md` — invariants métier (facturation électronique, anti-replay, cache, panier cookie)
- `docs/RUNBOOK.md` — procédures opérationnelles, encaissement hors Stripe (`mark-as-paid`)
- `test/fixtures/stripe/README.md` — régénération des fixtures webhook
- `.claude/skills/stripe-integration/SKILL.md` — patterns du repo (non versionné)
