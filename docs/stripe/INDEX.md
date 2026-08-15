> ⚠️ **Migration lean en cours (2026-08)** : l'intégration Elements décrite ici est
> retirée — le lot 3 la remplace par Stripe Checkout hébergé. Les chemins barrés
> n'existent plus ; ce document sera refondu au lot 3.

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
| Events webhook routés | 11                                                                     |
| Facturation           | PDF maison (jspdf) — **pas** Stripe Invoicing                          |
| Remboursements        | **Stripe-first** : émis depuis le Dashboard, ingérés par webhook       |

### Les 12 méthodes SDK appelées

| Méthode                                  | Appelant principal                                                                                                                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paymentIntents.create`                  | ~~modules/payments/actions/initialize-payment.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_                                                                                                            |
| `paymentIntents.retrieve`                | ~~app/paiement/retour/page.tsx~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_, `confirm-checkout.ts`, `sync-async-payments.service.ts`                                                                     |
| `paymentIntents.update`                  | `confirm-checkout.ts`, `update-payment-amount.ts`                                                                                                                                                                                  |
| `paymentIntents.cancel`                  | `cancel-orphan-payment-intent.ts`, `mark-as-paid.ts`, `sync-async-payments.service.ts`                                                                                                                                             |
| `refunds.create`                         | ~~modules/webhooks/services/payment-intent.service.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ (`initiateAutomaticRefund`), `payment-handlers.ts`                                                    |
| `refunds.retrieve`                       | ~~modules/cron/services/reconcile-refunds.service.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_                                                                                                        |
| `refunds.list`                           | ~~modules/webhooks/services/refund.service.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — `.autoPagingToArray()` quand `charge.refunds.has_more` (le payload du webhook plafonne à 10 remboursements) |
| `customers.create` / `.update` / `.list` | ~~modules/payments/services/stripe-customer.service.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — `.list({ email })` dédupe au-delà des 24 h de la clé d'idempotence                                 |
| `charges.retrieve`                       | ~~modules/payments/services/map-stripe-payment-method.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_                                                                                                    |
| `webhooks.constructEvent`                | `app/api/webhooks/stripe/route.ts`                                                                                                                                                                                                 |
| `balance.retrieve`                       | `app/api/health/route.ts` (ping de connectivité)                                                                                                                                                                                   |

### Les 11 events webhook routés

Registry unique : ~~modules/webhooks/utils/event-registry.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_. Chaque event a sa fixture
dans `test/fixtures/stripe/` et son assertion de routing dans
~~test/contract/stripe-events.test.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_.

| Event                                                                                               | Handler                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------ |
| `payment_intent.succeeded` · `.payment_failed` · `.canceled` · `.processing`                        | `handlers/payment-handlers.ts` |
| `charge.refunded` · `refund.created` · `refund.updated` · `charge.refund.updated` · `refund.failed` | `handlers/refund-handlers.ts`  |
| `charge.dispute.created` · `charge.dispute.closed`                                                  | `handlers/dispute-handlers.ts` |

`charge.refund.updated` est l'alias legacy de `refund.updated`, routé volontairement
au même handler pour ne pas dépendre de la version d'API souscrite par l'endpoint.

⚠️ **`invoice.payment_failed` a été retiré le 2026-08-07** (l'audit qui a fait passer ce
périmètre à 90/100). Il était routé sans pouvoir se déclencher : Stripe Invoicing n'est
pas utilisé (§ « Ce qui est délibérément exclu » ci-dessous), aucune Checkout Session
n'est créée, et `invoice_creation` n'existe nulle part au dépôt. Son handler ouvrait sur
« When `invoice_creation.enabled` is true in checkout » — prémisse morte depuis le
retrait des Checkout Sessions. Le rouvrir supposerait d'abord d'adopter Stripe Invoicing.
⚠️ Ne pas confondre avec `sendAdminInvoiceFailedAlert`, **vivante** : c'est l'alerte de la
DLQ de NOTRE numérotation (Art. 289-I), appelée par `ensure-invoice-number.service.ts`.

### ⏳ Montée de version en attente — `2026-07-29.dahlia`

Stripe a publié `2026-07-29.dahlia`, livrée par `stripe@22.4.0`. **Son changelog est déjà
dans `06-api-versioning.md`** : le mirror fait son travail, encore faut-il le lire.

Innocuité vérifiée le 2026-08-05 : les 5 entrées _breaking_ portent sur Checkout Sessions,
les métadonnées sectorielles `taxes`, Connect, Treasury et les shared payment tokens —
**aucune n'a d'appelant ici** (grep à blanc). Ce qui nous touche est additif : détails
client / moyen de paiement sur `Refund`, réseau de carte sur `Dispute`, résultat 3DS
« Data Share Only ».

**Le bump est ATOMIQUE**, `Stripe.LatestApiVersion` étant un littéral unique et non une
union — bumper le SDK sans la constante (ou l'inverse) casse `tsc`. Vérifié le 2026-08-07 en
le faisant : avec `stripe@22.4.0` installé, la constante restée en arrière produit
`TS2322: Type '"2026-06-24.dahlia"' is not assignable to type '"2026-07-29.dahlia"'`.

1. `pnpm add stripe@22.4.0` (⚠️ `pnpm add <pkg>@<version>`, jamais `pnpm up stripe`) ;
2. `pnpm add @stripe/stripe-js@9.13.0` ;
3. `STRIPE_API_VERSION` → `"2026-07-29.dahlia"` ;
4. les 11 `test/fixtures/stripe/*.json` (`api_version`) — deux tests l'assertent ;
5. cette section et le tableau ci-dessus.

**⚠️ Pourquoi ce n'est TOUJOURS pas fait — et le motif a changé le 2026-08-07.**

Le motif écrit ici jusque-là (« `stripe@22.4.0` est en quarantaine 7 j ») a **expiré** :
22.4.0 est publié le 2026-07-29 23:38 UTC, donc installable depuis le 2026-08-05 23:38 UTC.
Le bump a été tenté et **annulé** — le blocage réel est ailleurs, et il ne se voit qu'en
lisant le diff du lockfile :

> **Tout `pnpm add` re-résout l'arbre entier, et `minimumReleaseAge: 10080` fait alors
> tomber en silence les 8 `@next/swc-*@16.3.0`** — les binaires natifs de Next. Publiés le
> **2026-08-03 20:29 UTC** avec le reste de la famille 16.3.0, ils sont encore en
> quarantaine. Étant des dépendances **optionnelles**, pnpm ne lève aucune erreur : il les
> retire du lockfile. Résultat mesuré : `pnpm add stripe@22.4.0` produit **13 insertions et
> 97 suppressions**, dont les 8 binaires — et la CI Linux a besoin de
> `@next/swc-linux-x64-gnu`.

Le symétrique se voit à l'œil nu avec `--lockfile-only`, qui échoue franchement sur
`eslint-config-next@16.3.0` (dépendance **directe**, donc erreur dure au lieu d'un abandon
silencieux) : `ERR_PNPM_NO_MATCHING_VERSION … was released at Mon Aug 03 2026`. C'est le
même mécanisme, rendu visible parce que le paquet n'est pas optionnel.

⚠️ **Le motif général** : une quarantaine supply-chain échoue **bruyamment** sur une
dépendance directe et **silencieusement** sur une optionnelle. Un `pnpm add` pendant la
fenêtre de quarantaine d'un paquet TIERS mutile donc le lockfile sans rien dire.

**Débloqué le 2026-08-10 20:34 UTC** (fin de quarantaine de la famille Next 16.3.0). Refaire
le bump après cette date, et **vérifier que `git diff pnpm-lock.yaml` ne touche que les deux
lignes Stripe** — c'est la seule preuve que la re-résolution s'est bien passée.
`@stripe/stripe-js@9.13.0` (publié le 2026-08-04) sort de quarantaine le **2026-08-11** :
attendre cette date permet de tout faire en un seul passage.

L'échappatoire `--config.minimumReleaseAge=0` reste réservée au patch de sécurité urgent —
ce bump n'en est pas un, et le forcer viserait la dépendance la plus sensible du dépôt.

---

## Correspondance page Stripe → code Synclune

La partie qui ne s'obtient nulle part ailleurs : quelle page de doc éclaire quel site du repo.

| Page Stripe                                              | Bundle | Site Synclune                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments/payment-intents`, `api/payment_intents/create` | 01     | ~~modules/payments/actions/initialize-payment.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — `payment_method_types: ["card"]`                                                                                                                                                                  |
| `api/idempotent_requests`                                | 03     | 4 familles de clés, cf. tableau ci-dessous                                                                                                                                                                                                                                                                                  |
| `payments/payment-intents/verifying-status`              | 01     | ~~app/paiement/retour/page.tsx~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — décide sur `pi.status`, **jamais** sur `redirect_status` (manipulable)                                                                                                                                              |
| `payments/payment-intents/asynchronous-capture`          | 01     | ~~modules/cron/services/sync-async-payments.service.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — `payment_intent.payment_failed` est **non-terminal**, c'est ce cron qui acte l'échec                                                                                                        |
| `payments/3d-secure/authentication-flow`                 | 01     | `processing` / `requires_action` = 3DS en settlement (card-only, pas de SEPA/Klarna)                                                                                                                                                                                                                                        |
| `declines/codes`                                         | 01     | `mapStripeErrorMessage` dans ~~modules/payments/hooks/use-checkout-submit.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_                                                                                                                                                                         |
| `payments/payment-element`                               | 02     | ~~modules/payments/components/checkout-stripe-section.tsx~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — `<Elements key={clientSecret}>` (remontage forcé, régression documentée)                                                                                                                 |
| `js/payment_intents/confirm_payment`                     | 02     | ~~modules/payments/hooks/use-checkout-submit.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — `elements.submit()` puis `stripe.confirmPayment`                                                                                                                                                   |
| `js/elements_object`                                     | 02     | La **seule** doc d'`elements.submit()` (étape 2/4 de `use-checkout-submit.ts`) : la valider **avant** de confirmer, et **attendre sa promesse**. Il n'existe pas de page dédiée — `js/elements_object/submit` est une 404                                                                                                   |
| `elements/appearance-api`                                | 02     | ~~modules/payments/constants/stripe-appearance.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ (thème + variables + 5 sélecteurs de règles, doublés dark) et `hooks/use-stripe-appearance.ts`. ⚠️ Stripe **ignore silencieusement** un sélecteur inconnu : c'est la seule référence de leurs noms |
| `webhooks/signature`                                     | 03     | `app/api/webhooks/stripe/route.ts` — les 4 couches anti-replay sont documentées en tête du fichier                                                                                                                                                                                                                          |
| `api/events/types`                                       | 03     | ~~modules/webhooks/utils/event-registry.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_                                                                                                                                                                                                           |
| `webhooks/process-undelivered-events`                    | 03     | **Plus aucun site** — `retry-webhooks` a été retiré le 2026-08-05 (KI-006). La route renvoie 500, Stripe redélivre seul 3 jours ; au-delà, le rejeu se fait au Dashboard.                                                                                                                                                   |
| `refunds`, `api/refunds/object`                          | 04     | Ingestion Dashboard : ~~modules/webhooks/services/refund.service.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ (`syncStripeRefunds`, upsert par `stripeRefundId`)                                                                                                                               |
| `disputes/responding`                                    | 04     | **Pas de modèle `Dispute`** — l'état est dérivé d'`OrderHistory` par ~~modules/orders/services/has-open-dispute.service.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_                                                                                                                           |
| `api/charges/object`                                     | 04     | ~~modules/payments/services/map-stripe-payment-method.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — `card.wallet.type` → `WALLET`/`LINK` (arrêté 2022-1299 §4.3) et `created` → `Order.paidAt` (date d'encaissement, Art. 50-0 CGI)                                                           |
| `api/customers/list`, `api/customers/search`             | 01     | `stripe-customer.service.ts` — `list` et **pas** `search` : ce dernier s'exclut lui-même des flux read-after-write. ⚠️ Le filtre `email` de `list` est **case-sensitive**                                                                                                                                                   |
| `cli/trigger`                                            | 05     | ~~test/fixtures/stripe/README.md~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — régénération des 12 fixtures                                                                                                                                                                                      |
| `api/versioning`, `changelog/dahlia`                     | 06     | SSOT `shared/constants/stripe-api-version.ts`, consommée par `shared/lib/stripe.ts` **et** `app/api/health/route.ts` (qui instancie son propre client, d'où la constante à part)                                                                                                                                            |
| `rate-limits`                                            | 06     | Distinct de notre rate limit applicatif : `STRIPE_WEBHOOK_LIMIT` (1000/min) dans ~~shared/lib/rate-limit-config.ts~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_, appliqué **avant** la vérification de signature (anti-CPU-drain)                                                                 |

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
- ~~test/fixtures/stripe/README.md~~ _(retiré au lot 2 de la migration lean — checkout réécrit au lot 3)_ — régénération des fixtures webhook
- `.claude/skills/stripe-integration/SKILL.md` — patterns du repo (non versionné)
