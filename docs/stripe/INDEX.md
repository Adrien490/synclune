# Documentation Stripe — index et correspondance avec le code

Ce dossier contient un **mirror ciblé** de la documentation officielle Stripe : 40 pages
récupérées en markdown brut depuis `docs.stripe.com`, groupées en 5 bundles.

```bash
pnpm docs:stripe
```

**Seul ce fichier est versionné.** Les bundles (`01-*.md` … `06-*.md`) sont
gitignorés : la doc Stripe bouge en continu, un mirror commité serait périmé et
polluerait chaque diff. Ils sont aussi dans `.prettierignore` — sans ça,
`pnpm format:check`, donc `pnpm validate`, parcourt 1,9 Mo de markdown qu'on ne
maîtrise pas et rougit.

Le manifeste (quelle page va dans quel bundle) vit **en dur dans
`scripts/fetch-stripe-docs.ts`** : c'est la SSOT.

---

## Ce que Synclune utilise réellement de Stripe

C'est ce périmètre, et lui seul, qui détermine le contenu du mirror.

|                       |                                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| SDK serveur           | `stripe@22.3.2`                                                          |
| SDK client            | **aucun** — Checkout hébergé, la page de paiement est chez Stripe        |
| Version d'API         | **`2026-06-24.dahlia`**, SSOT `shared/constants/stripe-api-version.ts`   |
| Flow de paiement      | **Checkout Sessions hébergées**, `price_data` inline, eur. Zéro Elements |
| Méthodes SDK appelées | 4                                                                        |
| Events webhook routés | 2                                                                        |
| Facturation           | Numéro `Int` séquentiel en base (lot 4) — **pas** Stripe Invoicing       |
| Remboursements        | `refunds.create` via l'API au lot 5 (`RetractationRequest`)              |

### Les 4 méthodes SDK appelées

| Méthode                      | Appelant                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `checkout.sessions.create`   | `modules/payments/actions/create-checkout-session.ts` — après la réservation de stock           |
| `checkout.sessions.retrieve` | `modules/orders/actions/reconcile-pending-orders.ts` — filet manuel des réservations orphelines |
| `webhooks.constructEvent`    | `app/api/webhooks/stripe/route.ts`                                                              |
| `balance.retrieve`           | `app/api/health/route.ts` (ping de connectivité)                                                |

### Les 2 events webhook routés

Dispatch : `switch` dans `app/api/webhooks/stripe/route.ts` ; transitions dans
`modules/webhooks/services/checkout-session-transitions.service.ts`. Chaque event a sa
fixture dans `test/fixtures/stripe/` et son assertion de shape + parité de routing dans
`test/contract/stripe-events.contract.test.ts`.

| Event                        | Effet                                                                 |
| ---------------------------- | --------------------------------------------------------------------- |
| `checkout.session.completed` | PENDING → PAID (garde `updateMany`), identité + adresse Stripe, email |
| `checkout.session.expired`   | PENDING → CANCELLED + restock exactement-une-fois (même transaction)  |

L'idempotence est portée par la **garde de transition** (`stripeSessionId @unique` +
`status: PENDING`) — il n'y a plus de table `WebhookEvent`. Une erreur de traitement
répond **500** : Stripe redélivre pendant 3 jours, et le rejeu d'un event déjà traité
est un no-op. Au-delà de 3 jours : bouton admin « Vérifier les commandes en attente ».

### ⏳ Montée de version en attente — `2026-07-29.dahlia`

Stripe a publié `2026-07-29.dahlia`, livrée par `stripe@22.4.0`. **Son changelog est déjà
dans `06-api-versioning.md`.** Innocuité vérifiée le 2026-08-05 (les entrées breaking
Checkout portent sur des champs sans appelant ici) — à re-vérifier au moment du bump,
le périmètre Checkout Sessions étant désormais LE périmètre actif.

**Le bump est ATOMIQUE**, `Stripe.LatestApiVersion` étant un littéral unique et non une
union — bumper le SDK sans la constante (ou l'inverse) casse `tsc` :

1. `pnpm add stripe@22.4.0` (⚠️ `pnpm add <pkg>@<version>`, jamais `pnpm up stripe`) ;
2. `STRIPE_API_VERSION` → `"2026-07-29.dahlia"` ;
3. les fixtures `test/fixtures/stripe/*.json` (`api_version`) ;
4. cette section.

La quarantaine supply-chain qui bloquait le bump (famille Next 16.3.0, cf. historique
git de ce fichier) a expiré le 2026-08-10 : le bump est faisable. **Vérifier que
`git diff pnpm-lock.yaml` ne touche que les lignes Stripe** — une quarantaine échoue
bruyamment sur une dépendance directe et **silencieusement** sur une optionnelle (les
binaires `@next/swc-*` sont optionnels : pnpm les retire du lockfile sans erreur).

---

## Correspondance page Stripe → code Synclune

La partie qui ne s'obtient nulle part ailleurs : quelle page de doc éclaire quel site du repo.

| Page Stripe                                                  | Bundle | Site Synclune                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout Sessions (create, objet, fulfillment, `expires_at`) | 01     | `modules/payments/actions/create-checkout-session.ts` — `price_data` inline, `shipping_address_collection.allowed_countries` verrouillé sur le pays choisi, `expires_at` ≈ 30 min = durée de la réservation de stock |
| `webhooks/signature`                                         | 03     | `app/api/webhooks/stripe/route.ts` — signature obligatoire, anti-replay 300 s du SDK                                                                                                                                 |
| `api/events/types`                                           | 03     | dispatch `switch` de `app/api/webhooks/stripe/route.ts`                                                                                                                                                              |
| `webhooks/process-undelivered-events`                        | 03     | **Aucun retry maison** — 500 ⇒ Stripe redélivre 3 j ; au-delà, `modules/orders/actions/reconcile-pending-orders.ts` (bouton admin)                                                                                   |
| `refunds`, `api/refunds/object`                              | 04     | Lot 5 (`RetractationRequest` → `refunds.create`)                                                                                                                                                                     |
| `cli/trigger`                                                | 05     | régénération des fixtures de `test/fixtures/stripe/` (`stripe trigger <type> --print-json`)                                                                                                                          |
| `api/versioning`, `changelog/dahlia`                         | 06     | SSOT `shared/constants/stripe-api-version.ts`, consommée par `shared/lib/stripe.ts` **et** `app/api/health/route.ts` (qui instancie son propre client, d'où la constante à part)                                     |
| `rate-limits`                                                | 06     | Plus de rate limit applicatif (perte volontaire § 1 de la migration lean) — cette page documente les limites CÔTÉ Stripe                                                                                             |

### Clés d'idempotence

**Aucune clé d'idempotence Stripe n'est en circulation** : `checkout.sessions.create`
n'est pas rejouée (chaque soumission du formulaire crée sa propre réservation ; un échec
fait un rollback compensatoire, cf. `modules/payments/services/checkout-reservation.service.ts`).
L'idempotence du POST-paiement est ailleurs :

| Mécanisme                                        | Porteur                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| Garde de transition `updateMany` (PENDING→PAID)  | `modules/webhooks/services/checkout-session-transitions.service.ts` |
| `idempotencyKey` **Resend** `order-confirm:<id>` | `modules/emails/services/send-order-confirmation.tsx`               |

---

## Ce qui est délibérément exclu

L'index officiel `docs.stripe.com/llms.txt` compte **481 pages**. On en garde 40.
Les ~440 autres couvrent des produits qui n'ont **aucun appelant** dans le repo :

**Connect** · **Issuing** · **Terminal** · **Treasury** · **Capital** · **Crypto** ·
**Climate** · **Sigma** · **Atlas** · **Radar** · **Identity** · **Financial Connections** ·
**Revenue Recognition** · **Tax** · **Billing** (abonnements) · **Payment Links** ·
**Invoicing** (la facture est un numéro séquentiel en base + rendu HTML, lot 4 — pas
Stripe Invoicing) · **Elements / PaymentIntents côté client** (perte volontaire § 1 :
le tunnel est hébergé chez Stripe).

---

## ⚠️ Ne pas régénérer le manifeste depuis `llms.txt`

`llms.txt` est **curé, et lacunaire précisément sur notre périmètre**. Manquent entre
autres `api/idempotent_requests`, `api/checkout/sessions/expire` et `changelog/dahlia`. Un filtre par
section aurait raté l'essentiel. D'où un manifeste écrit à la main, chaque page
vérifiée en HTTP 200.

Corollaire pour le script : **une 404 de `docs.stripe.com` renvoie un corps de ~24 Ko**,
pas un corps vide. `fetch-stripe-docs.ts` rejette sur `!res.ok` et n'écrit rien si une
seule page manque — sinon la page d'erreur se noierait dans un bundle de 940 Ko. Un
échec signale qu'une page a été déplacée côté Stripe : corriger le manifeste.

## ⚠️ Une 200 ne veut pas dire du contenu — le piège des pages à variantes

Stripe décline certaines pages par intégration ou par langage. **L'URL nue rend alors un
sommaire de ~500 o**, pas la doc :

> This article has multiple variants. Fetch one of the following URLs…

C'est le symétrique du piège 404, en plus vicieux : rien ne le signale. L'audit du
2026-08-05 en a trouvé **quatre** au mirror, dont `payments/accept-a-payment` stockée en
1053 o là où sa variante en fait 77 695. Une entrée de manifeste peut donc porter une
query, et le script **refuse** désormais une page-sommaire en listant les variantes
disponibles :

| Page                                           | Variante retenue                        |
| ---------------------------------------------- | --------------------------------------- |
| `payments/accept-a-payment`                    | `?payment-ui=checkout&ui=stripe-hosted` |
| `payments/checkout/how-checkout-works`         | `?payment-ui=stripe-hosted`             |
| `payments/checkout/managing-limited-inventory` | `?payment-ui=stripe-hosted`             |
| `payments/checkout/custom-success-page`        | `?payment-ui=stripe-hosted`             |
| `checkout/fulfillment`                         | `?payment-ui=stripe-hosted`             |
| `get-started/development-environment`          | `?lang=node`                            |

## La locale est épinglée

Le script force `?locale=fr-FR`. Sans ce paramètre, Stripe négocie la langue sur la **géo
de l'appelant** : le mirror a été généré en français depuis la France, un run CI ou
derrière un VPN l'aurait rendu en anglais — 1,9 Mo de diff pour zéro changement de
contenu. L'idempotence annoncée par le script n'était vraie que sur une seule machine.

---

## Les 5 bundles

| Fichier                   | Pages | Couvre                                                                                                                                                                 |
| ------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-checkout-sessions.md` | 11    | Checkout hébergé : `accept-a-payment` (variante hébergée), fonctionnement, inventaire limité, page de retour, fulfillment, API Sessions (create/retrieve/expire/objet) |
| `03-webhooks.md`          | 8     | Réception, signature, quickstart, events non délivrés, destinations, types d'events, requêtes idempotentes                                                             |
| `04-refunds.md`           | 4     | Remboursements (guide + API refunds : create, objet)                                                                                                                   |
| `05-testing.md`           | 6     | Cartes de test, Stripe CLI, `stripe trigger`, checklist de mise en production, environnement de dev                                                                    |
| `06-api-versioning.md`    | 11    | Montées de version, versioning, **changelog `dahlia`**, erreurs, rate limits, metadata, expansion, pagination, devises, guide sécurité, SDKs                           |

## Sources complémentaires dans le repo

- `docs/MIGRATION-PROMPTS.md` — décisions D4-D5 (Checkout hébergé, cycle PENDING→PAID)
- `CLAUDE.md` — invariants d'invalidation de cache (webhook ⇒ `revalidateTag`, jamais `updateTag`)
