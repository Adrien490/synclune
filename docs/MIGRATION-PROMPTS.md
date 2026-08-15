# MIGRATION-PROMPTS.md — Migration vers le schéma « lean » (Stripe Checkout hébergé)

> ## ✅ MIGRATION TERMINÉE (2026-08-15)
>
> Les 10 lots sont livrés (voir le tableau § 3). `CLAUDE.md` décrit désormais le nouveau
> monde et fait foi. Ce document est conservé comme HISTORIQUE de la migration — décisions,
> pertes volontaires, notes de sortie de lots — et pourra être supprimé dans un commit
> ultérieur.

> **Matériau de travail — à supprimer à la fin de la migration.** Rédigé le 2026-08-14 sur la
> base du schéma cible fourni par Adrien. Ce document est la SSOT du chantier : chaque lot
> ci-dessous est un **prompt autonome** à copier-coller dans une **session Claude fraîche**, dans
> l'ordre. Le tableau de suivi (§ 3) est le seul état partagé entre sessions. Remplace les plans
> antérieurs : `SIMPLIFICATION-V2.md`, `LOT-C-PLAN.md` et `CHECKOUT-FLOW-MAP-2026-08-10.md`
> deviennent des archives (le lot C variante Elements est **abandonné**).

---

## 0. Décisions actées (2026-08-14, Adrien) — non rediscutables par une session d'exécution

| #   | Décision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Base jetable** : reset complet de la base, nouveau baseline de migrations, **aucune migration de données**. Les 44 migrations actuelles et `prisma/sql/raw-guards.sql` sont supprimées.                                                                                                                                                                                                                                                                                                                                                                               |
| D2  | **Le schéma cible (§ 4) fait foi, tel quel** : 9 modèles, `invoiceNumber Int? @unique` séquentiel (plus de format `F-YYYY-NNNNN`), pas d'archivage PDF SHA-256, pas d'`OrderHistory`, pas de `WebhookEvent`, pas de `StoreSettings`. ~~pas de `ProductType`~~ — **amendé le 2026-08-15 (Adrien, en cours de lot 2)** : `ProductType` est CONSERVÉ, en forme lean `{ id, slug, label, position }` + `Product.typeId` (FK `Restrict`), sans statut/description/dates ni flag système. Une seule retouche autorisée par ailleurs : le `output` du generator (voir ⚠️ § 4). |
| D3  | **Better Auth disparaît.** Auth admin = mot de passe unique `ADMIN_PASSWORD` en variable d'environnement + cookie de session signé maison (HMAC, httpOnly). **Zéro table d'auth en base.**                                                                                                                                                                                                                                                                                                                                                                              |
| D4  | **Stripe Checkout hébergé** : plus de page de paiement maison. Une action `createCheckoutSession` (line items en `price_data` inline, `shipping_address_collection`, devise `eur` codée en dur) + `redirect(session.url)`. Webhooks : `checkout.session.completed` et `checkout.session.expired`.                                                                                                                                                                                                                                                                       |
| D5  | **Cycle de vie commande** (défini par les commentaires du schéma cible) : `Order` **PENDING** créé à la création de la session Checkout avec **stock décrémenté** (= réservation) → webhook `completed` (payment_status=paid) → **PAID** ; webhook `expired` → **CANCELLED + restock**.                                                                                                                                                                                                                                                                                 |
| D6  | **« Vert aux frontières »** : chaque lot se termine avec `pnpm validate` vert. Le rouge est autorisé **en cours** de lot, jamais entre deux lots. Exception : les e2e Playwright (hors `validate`) sont rouges assumés des lots 2 à 6 — le lot 7 les refonde.                                                                                                                                                                                                                                                                                                           |

## 1. Pertes volontaires — INTERDIT de restaurer

Toute session d'exécution qui « découvre » qu'un de ces éléments manque doit considérer que
c'est **voulu**. Ne pas le recréer, ne pas le « réparer », ne pas ré-écrire son test.

- **Better Auth** et ses 4 tables (`User`, `Session`, `Account`, `Verification`), la vérification
  d'email, le reset de mot de passe, les rôles en base.
- ~~**`ProductType`**~~ — **amendement 2026-08-15** : conservé finalement (demande d'Adrien en
  cours de lot 2). Le module `modules/product-types/`, la route `/produits/[productTypeSlug]` et
  l'admin `catalogue/types-de-produits` restent, adaptés au style lean (pas de `isActive`/
  `isSystem`/`description`/dates, pas de toggle de statut, suppression bloquée par FK `Restrict`).
- **`StoreSettings`** (fermeture de boutique, `orphanMediaScanOffset`).
- **`WebhookEvent`** (table d'idempotence — remplacée par `Order.stripeSessionId @unique` + gardes
  de transition, cf. lot 3).
- **`OrderHistory`** (timeline admin, enum `OrderAction`, `HistorySource`).
- **`Refund`** en tant que modèle (remplacé par `RetractationRequest`, périmètre différent).
- **Numérotation `F-YYYY-NNNNN` / `A-YYYY-NNNNN`**, advisory locks de séquence, CHECK constraints
  de format, trigger cross-table des avoirs.
- **Génération et archivage PDF** des factures/avoirs (jspdf, UploadThing, hashes SHA-256, routes
  `api/orders/[orderNumber]/{invoice,credit-note}`).
- **Les 3 crons Vercel** (`reconcile-invoices`, `cleanup-pending-orders`, `hard-delete-retention`)
  et la page admin Maintenance.
- **Stripe Elements / PaymentIntent côté client** (les 12 composants `checkout-*`,
  `confirmCheckout`, `initialize-payment`, `use-payment-intent`, `use-checkout-submit`…).
- **Le rate limiting des Server Actions** (`shared/lib/rate-limit*`, presets, tests associés).
- **Les tests contract/regression** qui verrouillaient tout ce qui précède (purge nominative lot
  par lot ; un test qui teste un invariant abandonné se **supprime**, il ne s'adapte pas).

## 2. Conventions d'exécution

- **Un lot = une session fraîche = un commit** `migration(lot-N): <nom>`. Ne pas pousser sans
  demande explicite.
- **Préconditions KO ⇒ STOP.** Une session qui trouve un état de départ non conforme (git sale,
  `validate` rouge, lot précédent non coché) s'arrête et signale — elle ne répare pas le lot
  précédent.
- **Lire ce document d'abord.** Chaque prompt commence par la lecture des §§ 0, 1, 2 et 4 de
  `docs/MIGRATION-PROMPTS.md` — le fichier est dans le repo, la session peut le lire.
- **CLAUDE.md est gelé** jusqu'au lot 9 (seule exception : la note de tête posée au lot 0).
  CLAUDE.md décrit l'ANCIEN monde : en cas de conflit avec ce document, **ce document gagne**.
- Le lot qui casse une surface met à jour **dans le même lot** : `proxy.ts` (default-deny),
  le script `test:critical` de `package.json` + le grep du hook `.husky/pre-commit`,
  `knip.config`, et la navigation admin.
- En fin de lot : cocher la ligne du § 3 (statut, hash de commit, notes utiles au lot suivant).

## 3. Tableau de suivi

| Lot | Nom                                       | Taille | Statut | Commit             | Notes                                                                                                                         |
| --- | ----------------------------------------- | ------ | ------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 0   | Préparation du terrain                    | S      | ✅     | `migration(lot-0)` | Branche `migration-lean`, tag `pre-migration-lean`. Voir « État à la sortie du lot 0 » ci-dessous — 3 pièges d'environnement. |
| 1   | Auth maison (purge Better Auth)           | L      | ✅     | `migration(lot-1)` | Voir « État à la sortie du lot 1 » ci-dessous.                                                                                |
| 2   | Bascule schéma + purge + catalogue        | XL     | ✅     | `migration(lot-2)` | Voir « État à la sortie du lot 2 » ci-dessous. **Amendement en cours de lot : `ProductType` conservé (cf. D2).**              |
| 3   | Checkout Stripe hébergé + webhooks        | L      | ✅     | `migration(lot-3)` | Voir « État à la sortie du lot 3 » ci-dessous. Port fixé par un select de pays sur /paiement ; CTA panier inchangé.           |
| 4   | Commandes : admin, facturation Int, suivi | L      | ✅     | `migration(lot-4)` | Voir « État à la sortie du lot 4 » ci-dessous.                                                                                |
| 5   | Rétractation (`RetractationRequest`)      | M      | ✅     | `migration(lot-5)` | Voir « État à la sortie du lot 5 » ci-dessous.                                                                                |
| 6   | Dashboard, emails, polish admin           | M      | ✅     | `migration(lot-6)` | Voir « État à la sortie du lot 6 » ci-dessous.                                                                                |
| 7   | E2E refonte                               | L      | ✅     | `migration(lot-7)` | Voir « État à la sortie du lot 7 » ci-dessous. Suite verte multi-navigateurs en 10,3 min (build prod local).                  |
| 8   | Seed conforme à la DA                     | S/M    | ✅     | `migration(lot-8)` | Voir « État à la sortie du lot 8 » ci-dessous. db:reset + suite e2e complète 100% verte sur le nouveau jeu.                   |
| 9   | Documentation finale (CLAUDE.md) + sweep  | M      | ✅     | `migration(lot-9)` | Voir « État à la sortie du lot 9 » ci-dessous. **Migration terminée.**                                                        |

### État à la sortie du lot 0

**Trois pièges d'environnement font croire à une précondition KO.** Ils ont tous les trois fait
rougir `pnpm validate` au lot 0 alors que `main` était sain — avant de conclure « précondition KO,
STOP », vérifier ces trois-là :

1. **Client Prisma désynchronisé** → `pnpm lint` rouge sur des dizaines d'« Unsafe assignment of an
   error typed value » et « value is `never` » dans des modules non touchés. Correctif :
   `pnpm prisma generate`.
2. **`.next/dev/types/validator.ts` périmé** → `pnpm typecheck` rouge sur un `TS2307` visant une
   route supprimée (`Cannot find module '.../route.js'`). Correctif : `rm -rf .next`. Attendu à
   chaque lot qui supprime une route — les lots 1 à 4 en suppriment beaucoup.
3. **Dossier de migration vide** laissé par un `prisma migrate dev` avorté → collection Vitest en
   erreur `ENOENT … /migration.sql`. Correctif : supprimer le dossier. (Sans objet après le lot 2,
   qui refait le baseline.)

**Effets de bord assumés du lot 0**, à ne pas « réparer » :

- `test/contract/fonts-docs-parity.contract.test.ts` a perdu son volet « docs » (ses 4 sujets
  vivaient dans `docs/prompts/`, supprimé). Son volet « emails » est intact. Le nom du fichier
  est devenu imprécis — à renommer au lot 9, pas avant.
- `CLAUDE.md` cite encore `claude-md-accuracy.contract.test.ts` (§ Conformité réglementaire) : le
  fichier est **gelé**, la référence morte part au lot 9.
- Deux migrations citent `schema-migration-parity` en commentaire SQL — elles disparaissent au
  lot 2 avec tout `prisma/migrations/`.
- `commitlint.config.ts` accepte désormais le type `migration` (le hook `commit-msg` rejetait
  `migration(lot-N): …`, bloquant la convention de commit du chantier). À retirer au lot 9.

### État à la sortie du lot 1

**Ce qui existe désormais** — `modules/admin-auth/` : cookie `admin_session` =
`<expiry>.<hmac>` (HMAC-SHA256 de l'expiry avec `AUTH_SECRET`, httpOnly + secure +
sameSite=lax, 7 j) ; `login`/`logout` (actions), `requireAdmin()` / `requireAdminApiRoute()`
(→ `{ admin: true } | …`, plus de `.user`) / `isAdmin()` / `assertAdminPage()` /
`hasValidAdminSession()` / `enforceRateLimitForCurrentUser()` (identité `"admin"` ou IP).
Page de connexion : `app/admin/connexion` (hors garde) ; tout le reste de l'admin vit dans
`app/admin/(protected)/` (le layout garde le chargement dur, chaque page garde la navigation
client — invariant inchangé). `ADMIN_DISPLAY_NAME = "Léane"` remplace `user.name` partout
(audit `authorName`, sidebar, UploadThing).

**Décisions prises en route, à connaître aux lots suivants** :

- **`AUTH_SECRET` signe AUSSI les tokens de suivi de commande** (`order-token-signer.ts`,
  ex-`BETTER_AUTH_SECRET`). En prod, reprendre la valeur de `BETTER_AUTH_SECRET` pour ne pas
  invalider les liens de suivi déjà emailés.
- **`connection()` avant `Date.now()`** dans `admin-session.ts` : sans ça, le prérendu PPR
  refuse toute page qui valide un cookie présent. Même famille de contrainte :
  `app/admin/connexion/loading.tsx` est la frontière Suspense OBLIGATOIRE de la page (elle
  lit un cookie).
- **Le proxy ne redirige PLUS un « déjà connecté » depuis `/admin/connexion`** : il ne sait
  pas valider le HMAC (node:crypto), et rediriger sur la simple présence du cookie bouclait
  pour un cookie expiré. C'est la PAGE qui redirige après validation réelle.
- `requireAdminWithUser`, `requireAuth`, `requireActiveAccountIfAuthenticated`,
  `isVerifiedAdmin`, `getSession` n'existent plus ; le checkout et le panier sont
  100 % invité jusque dans les tests (plus aucune branche session).
- Deux corrections de bugs PRÉEXISTANTS débusqués par la vérif manuelle :
  `brandLinkLabel` extrait de `logo.tsx` (module client) vers
  `shared/components/brand-link-label.ts` (les Server Components l'appellent), et le
  `$queryRaw` de `get-kpis.ts` qui référençait la colonne `Order."userId"` droppée le
  2026-08-05.
- `commitlint` : scope `lot-1` non listé → warning non bloquant, assumé.
- **knip** (déjà rouge sur main, hors gate) signale en plus après ce lot : `@prisma/client`
  (n'était tiré que par l'adapter Better Auth — à retirer au lot 2 avec le nouveau client),
  `DropdownMenuLabel`, `ServerActionFn`, `logo-animated.tsx`. À purger au fil des lots.
- La base dev locale a été resynchronisée (`db push --accept-data-loss`, accord d'Adrien) —
  elle avait dérivé bien avant le lot (table `Refund` absente).

### État à la sortie du lot 2

**Schéma en place** — baseline unique `prisma/migrations/20260815001033_init/` (base dev resettée,
`migrate status` propre). Le schéma effectif = § 4 **+ le modèle `ProductType` lean**
`{ id, slug, label, position }` et `Product.typeId` (FK `onDelete: Restrict`), réintégré à la
demande d'Adrien le 2026-08-15 en cours de lot. La convention `down.sql` est abandonnée (son
contract test est parti au lot 0). `prisma/sql/raw-guards.sql` et `RAW_SQL_GUARD_MIGRATIONS`
n'existent plus ; pg_trgm/unaccent ne sont plus installées par migration — la recherche fuzzy
retombe proprement sur ILIKE via `isPgTrgmAvailable` (dégradé assumé, réévaluer au lot 8/9).

**Renommage global `sku` → `variant`** (demande d'Adrien en cours de lot) : dossiers
(`modules/variants/`, routes admin `…/variantes/[variantId]`), identifiants
(`prisma.productVariant`, `CART_VARIANT_SELECT`, `getVariantInvalidationTags({ variantId, … })`),
cookie panier : les lignes portent désormais des ids de `ProductVariant` sous la clé `variantId`
(les anciens cookies échouent au parse → panier vide, sans conséquence : base resettée).

**Sémantique lean appliquée partout** :

- prix effectif d'une variante = `variant.priceCents ?? product.priceCents` (helpers :
  `calculatePriceInfo(variants, basePriceCents)`, `effectivePrice()` du panier) ;
- identité URL d'une couleur = son NOM slugifié (`slugify(color.name)`, param `?color=`) ;
  matchers : `variant-filter.service.ts` (avec repli matériau pour une variante sans couleur) ;
- statut = booléens `active` (produit/collection), plus d'enum `PublicationStatus` ; le filtre
  admin URL reste `status=active|inactive` ;
- média sur le PRODUIT (`ProductMedia`), `pickPrimaryImage()` inchangée dans sa règle ; plus de
  `thumbnailUrl`/`blurDataUrl`/`width`/`height` (une vidéo sans poster rend un placeholder) ;
- représentant d'un produit = première variante (ordre id) ; plus de vedette de collection.

**Stubs (TODO lots 3-6)** : `modules/payments/` (README + page `/paiement` placeholder),
`app/api/webhooks/stripe/route.ts` (signature → log → 200), `modules/dashboard/` (KPIs à 0),
commandes admin + `/suivi-commande` stubbés. `modules/orders/` garde le socle
(shipping, carrier, `retractation-eligibility.service.ts` sauvé du lot 2.1).

**Pertes/retraits supplémentaires actés en route** :

- rate limiting retiré partout (login, recherche, uploads, csp-report) — §1 ;
- toggles de statut couleur/matériau supprimés (plus de colonne `active`) ; les routes admin
  couleurs/matériaux sont keyées par **id** (`[id]`), celles des types par slug ;
- `set-default-variant`, `compareAtPrice` (prix barré), vedette de collection, archivage :
  supprimés avec leurs surfaces ;
- `docs/stripe/INDEX.md` : chemins Elements morts barrés + bannière, refonte au lot 3 ;
- `zod-prisma-length-parity.contract.test.ts` supprimé (plus AUCUNE colonne `VarChar(n)`).

**⚠️ Dette de tests assumée (la plus grosse note du lot)** : ~245 suites écrites pour l'ancien
schéma ont été SUPPRIMÉES plutôt qu'adaptées (composants admin/storefront, actions, hooks,
data du catalogue — l'inventaire est dans le commit). Ont été ADAPTÉS : les contract tests
(`read-queries`/`transactional-writes-schema-validity` — qui ont attrapé 2 vrais résidus
`deletedAt` —, `admin-actions-require-admin`, `server-action-*`, `stripe-docs-mirror`) et un
noyau de tests de services purs (query builders couleurs/matériaux/collections,
`variant-filter`, `product-validation`, panier `item-availability` + `cart-pricing-calculator`).
La suite est verte (7310 tests) mais la couverture du catalogue est amputée : chaque lot suivant
doit RE-TESTER ce qu'il touche, et le lot 7 (e2e) est la contrepartie planifiée.

**Divers** : seed minimal `prisma/seed.ts` (7 types système, 6 couleurs, 4 matériaux,
3 collections, 5 produits ; images picsum — hôte autorisé en DEV uniquement dans
`next.config.ts`). `test:critical` et `.husky/pre-commit` réalignés (cart, orders, payments,
webhooks, admin-auth, route webhook, contracts). Vérification dev : accueil, /produits,
/produits/bagues, PDP, /collections + détail, /favoris, /paiement (placeholder), admin
connexion + catalogue complet (produits, variantes, couleurs, matériaux, collections,
types-de-produits) → 200.

### État à la sortie du lot 3

**Le paiement fonctionne** : `createCheckoutSession`
(`modules/payments/actions/create-checkout-session.ts`) lit le panier cookie, revalide
chaque ligne en base, puis en transaction décrémente le stock (`updateMany`
conditionnel `stock: { gte: qty }`, count vérifié ligne par ligne — jamais de
read-then-write) et crée l'Order PENDING avec snapshots ; la session Stripe est créée
APRÈS (price_data inline eur, `expires_at` +31 min, `metadata.orderId`), le
`stripeSessionId` réel remplace un placeholder `pending_…` (colonne non nulle
`@unique`), et un échec Stripe déclenche un rollback compensatoire (restock + delete).
`redirect(session.url)` est hors try/catch.

**Choix actés en route, à connaître aux lots suivants** :

- **Frais de port : select de pays sur /paiement.** Le pays choisi fixe le
  `shipping_option` unique ET verrouille `shipping_address_collection.allowed_countries`
  sur ce seul pays — pas de port France payé pour une livraison allemande. Tarifs :
  `SHIPPING_RATES` (FR 4,99 € / UE 9,50 €), inchangés. ⚠️ **Limite assumée
  Corse/DOM-TOM** : le code postal n'est connu qu'après la création de session, donc
  l'exclusion postale d'`isUnshippableDestination` ne s'applique plus au checkout —
  une commande Corse peut passer au tarif FR ; Léane arbitre à la main.
- **CTA panier inchangé** : le sheet garde son lien vers `/paiement`, devenue page de
  récap (articles, pays, totaux) + bouton submit → action. JAMAIS de création de
  session sur un GET (un prefetch réserverait du stock).
- **Transitions partagées** dans
  `modules/webhooks/services/checkout-session-transitions.service.ts`
  (`markOrderPaidFromSession`, `cancelOrderFromExpiredSession`) : le service retourne
  les tags, l'appelant invalide selon son contexte (webhook →
  `revalidateTagsInBackground`, action admin → `updateTagsAfterMutation`).
  L'idempotence est la garde `updateMany({ stripeSessionId, status: PENDING })` ;
  restock d'`expired` dans la même transaction, exactement-une-fois.
- **Email de confirmation** : émetteur unique
  `modules/emails/services/send-order-confirmation.tsx` (idempotencyKey Resend
  `order-confirm:<orderId>`), template `order-confirmation-email.tsx` adapté lean
  (items = snapshots, adresse = colonnes `shipping*`). ⚠️ `orderNumber` affiché =
  l'`Order.id` et `trackingUrl` = null → **le lot 4 branche `invoiceNumber` et le
  lien de suivi HMAC**. Un échec d'email ne fait pas échouer la transition (sinon le
  500 ferait redélivrer un event devenu no-op et l'email ne partirait jamais).
- **`Order.email` naît `""`** (collecté par Stripe, écrit au webhook depuis
  `customer_details` / `collected_information.shipping_details`).
- **Réconciliation admin** : bouton « Vérifier les commandes en attente » sur
  `/admin/ventes/commandes` (`modules/orders/actions/reconcile-pending-orders.ts`) —
  PENDING > 24 h → `checkout.sessions.retrieve` → applique l'état réel ; traite aussi
  les vestiges `pending_…` et les sessions `resource_missing` comme expirées.
- **SDK client Stripe désinstallé** (`@stripe/stripe-js`, `@stripe/react-stripe-js`,
  `shared/lib/stripe-client.ts` supprimé) — le checkout hébergé n'a aucun JS Stripe
  côté client. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` n'a plus de lecteur (sweep lot 9).
  Le `pnpm remove` a aussi purgé du lockfile l'arbre orphelin de better-auth (lot 1).
- **Tests** : `test/contract/stripe-events.contract.test.ts` recréé (2 fixtures
  `checkout.session.*`, shape des champs consommés + parité fixtures ↔ `case` de la
  route) ; unitaires réservation (count mismatch → rollback), transitions (rejeu
  no-op, restock une seule fois), constructeurs purs. `docs/stripe/INDEX.md` refondu
  (4 méthodes SDK, 2 events) — la re-curation des bundles du mirror reste à faire.
- **Vérification** : CLI Stripe absent de la machine → parcours vérifié par script
  (session Stripe test réelle + events SIGNÉS injectés sur la route du serveur dev) :
  signature invalide → 400, completed → PAID + adresse + email Resend parti, rejeu →
  no-op, expired → CANCELLED + restock, rejeu → stock stable. ⚠️ Le parcours humain
  complet (page Stripe, carte 4242, `stripe listen`) reste à faire par Adrien.

### État à la sortie du lot 4

**Numérotation** : `invoiceNumber` (Int nu, séquentiel) est attribué DANS la transaction de
la transition PENDING→PAID (`transitionToPaidWithInvoiceNumber`, privé de
`checkout-session-transitions.service.ts`) — `max + 1`, retry borné ×3 sur P2002, pas
d'advisory lock. **Le webhook (et la réconciliation admin, qui passe par le même service)
est le SEUL écrivain** ; jamais de commande PAID sans numéro, l'échec des 3 tentatives fait
répondre 500 (Stripe redélivre). L'email de confirmation affiche « n° X » et porte le lien
de suivi.

**Admin commandes** (`/admin/ventes/commandes`) : liste (recherche email / n° facture / id,
filtre `filter_status` multi, tri date, pagination curseur — `getOrders` est ADMIN ONLY,
sans variante publique), détail par `[orderId]` (SNAPSHOTS uniquement — les FK ne servent
qu'aux liens de navigation), actions « Marquer expédiée » (PAID→SHIPPED, `updateMany` gardé,
`shippedAt` + `trackingNumber` saisi en dialog, transporteur auto-détecté, email) et
« Annuler » (PENDING→CANCELLED via `cancelOrderFromExpiredSession` — ⚠️ la session Stripe
est **expirée AVANT** la transition : une session encore `open` laisserait la cliente payer
une commande annulée ; si elle est déjà `complete`, l'annulation est refusée). REFUNDED =
lot 5. Pastille de nav `orders` = count des PAID à expédier ; `ORDERS_TO_SHIP_HREF` pointe
`?filter_status=PAID`.

**Suivi client** (`/suivi-commande?commande=<id>&token=<hmac>`) : token =
HMAC-SHA256(`orderId:email` minuscule) signé `AUTH_SECRET`
(`modules/orders/lib/order-tracking-token.ts`, fonctions pures), vérifié CONTRE l'email en
base — token invalide ⇒ 404 indistinct (anti-énumération). Lecture fraîche sans cache
(donnée nominative). `buildOrderTrackingUrl` est la SSOT de l'URL (fail-closed sans
`AUTH_SECRET`).

**Facture** = rendu HTML imprimable `/suivi-commande/facture` (token client OU session
admin), reconstruite à chaque affichage : identité vendeur `getVendorLegalInfo()` (env),
lignes snapshots, mention `DEFAULT_FRANCHISE_VAT_MENTION`, pied `getInvoiceFooter()`,
`window.print`. Pas de PDF, pas d'archive, pas de hash (D2). ⚠️ **Date de facture ET date
d'encaissement de l'export = `createdAt`** de la commande (la date Stripe n'est plus
stockée ; `updatedAt` serait pire, il bouge à l'expédition ; l'écart réel ≤ ~31 min, la
durée de vie d'une session Checkout). Limite assumée, documentée sur les deux surfaces.

**Export livre de recettes** : `POST /api/admin/orders/export` (`requireAdminApiRoute`) —
CSV `;` + BOM UTF-8, commandes PAID/SHIPPED/REFUNDED triées par numéro, colonnes
numero_facture/date/email/total_ttc_eur/statut. Bouton sur la liste admin (`downloadCSV`).

**Emails** : `shipping-confirmation` adapté lean (adresse `ShippingAddress` partagée,
émetteur `send-shipping-confirmation.tsx`, idempotencyKey `order-shipped:<id>`,
transporteur + date estimée dérivés). `EMAIL_SUBJECTS` purgé à 2 entrées (confirmation,
expédition) — le lot 5 recrée les siens. `error-code-block.tsx` (orphelin) supprimé.
Un échec d'email ne défait JAMAIS une transition (message admin l'indique).

**Piège découvert** : toute page à IO non cachée (prisma direct, cookies) DOIT avoir un
`loading.tsx` (frontière Suspense), sinon le prérendu PPR log « uncached data during
prerendering » (et casserait le build) — ajoutés sur /suivi-commande, /suivi-commande/facture,
/paiement, /paiement/retour. Même contrainte que `app/admin/connexion/loading.tsx` (lot 1).

**Vérifié en dev** (script + events Stripe signés, CLI Stripe absent) : 2 achats →
numéros 1 puis 2, rejeu sans re-numérotation, suivi 200/404 selon token, facture (numéro +
mention 293 B + vendeur), expédition → tracking sur le suivi, annulation → restock sans
numéro, export refusé sans session. Restent à cliquer par Adrien : le dialog d'expédition
et l'annulation depuis l'admin (couverts en tests unitaires).

### État à la sortie du lot 5

**Nouveau module `modules/retractations/`** (constants, schemas, data, actions, services,
components). La machine à états est STRICTEMENT MONOTONE, gardée par `updateMany` sur le
statut source : RECEIVED → ACKNOWLEDGED → AWAITING_RETURN → REFUNDED, REJECTED possible
tant que non remboursée.

**Surface publique** : bouton « Me rétracter » sur /suivi-commande (motif OPTIONNEL) via
`requestRetractation` — parse Zod PUIS token HMAC vérifié contre l'email en base AVANT
toute écriture (anti-énumération : même message pour token faux et commande inconnue).
`@unique(orderId)` ⇒ P2002 = « demande déjà enregistrée » (une seule demande par commande,
même rejetée — la suite passe par email). L'accusé de réception part SANS DÉLAI
(`retractation-ack:<orderId>`) ; s'il part, la demande passe ACKNOWLEDGED — RECEIVED ne
dure que si l'envoi échoue, et le détail admin le signale. Hors délai : soumettable
(droit de demande), l'admin tranche. Éligibilité : le service transplanté au lot 2
(`retractation-eligibility.service.ts`, ancre `shippedAt`) — commande non expédiée =
pas de formulaire (annulation par email).

**Workflow admin** (`/admin/ventes/retractations`, entrée sidebar + hub Ventes — SANS
pastille de nav, l'échéance vit dans la liste) : liste (actives d'abord, alerte
`RefundDeadlineBadge` = 14 j après la DEMANDE, art. L221-24, calculée en couche data hors
cache et hors rendu — les composants restent purs), détail, 3 dialogs :

- « Colis reçu » → AWAITING_RETURN + `itemReceivedAt` (RECEIVED accepté en source si
  l'accusé a échoué) ;
- « Rembourser » : `stripe.refunds.create({ payment_intent })` INTÉGRAL avec
  idempotencyKey `retractation-refund-<id>` (un double clic rejoue le MÊME refund), puis
  `finalizeRetractationRefund` (service transactionnel) : REFUNDED + **`creditNoteNumber`
  = max+1 sur RetractationRequest — compteur séquentiel DISTINCT du compteur facture**,
  retry P2002 ×3 + `Order.status` REFUNDED + restock **OPT-IN décoché par défaut**
  (bijou retourné ≠ revendable) ignorant les `variantId` null. Pas de webhook `refund.*`
  (perte volontaire) : `stripeRefundId` est la trace ;
- « Rejeter » : motif REQUIS (≥10 c., `confirmDisabled`), envoyé tel quel par email — le
  motif n'est PAS persisté (schéma lean), il ne vit que dans l'email. L'exception légale
  (bijou personnalisé, art. L221-28 3°) est un arbitrage humain.

**Avoir** : `/suivi-commande/avoir` (token ou session admin) — UNE ligne au montant
remboursé + référence de la facture d'origine (art. 272-I), mention 293 B, imprimable.
Pas de PDF archivé. Lien dans l'email de remboursement et sur le suivi.

**Emails** : 3 templates + émetteurs idempotents (`retractation-ack`, `-refund`,
`-reject:<orderId>`), 3 sujets ajoutés à `EMAIL_SUBJECTS`. Un échec d'email ne défait
jamais une transition.

**Contract** : `ADMIN_ACTION_DIRS` += `modules/retractations/actions`,
`request-retractation` whitelistée (surface publique, garde token documentée).

**⚠️ Comportement découvert (vaut pour TOUTES les routes à `loading.tsx`)** : depuis les
frontières Suspense du lot 4, `notFound()` est streamé APRÈS le shell — le corps rendu est
bien la page 404 (aucune fuite, rendu identique token faux / commande inconnue) mais le
**statut HTTP est 200**. Trade-off standard du streaming PPR, assumé (pages noindex) ; les
e2e du lot 7 doivent asserter sur le CONTENU, pas le code HTTP.

**Vérifié en dev** (Stripe test RÉEL) : PaymentIntent confirmé `pm_card_visa` → commande
SHIPPED → bouton proposé sur le suivi → demande ACKNOWLEDGED affichée → colis reçu →
`refunds.create` réel succeeded → REFUNDED + avoir n° max+1 + Order REFUNDED + rejeu
noop → page avoir (numéro, réf. facture, 293 B) → suivi « remboursée » + lien avoir.
Restent à cliquer par Adrien : les 3 dialogs admin et l'email d'accusé réel (couverts en
tests unitaires ; les emails de remboursement/rejet partent par la même machinerie
Resend éprouvée aux lots 3-4).

### État à la sortie du lot 6

**Dashboard réécrit** (`modules/dashboard/` + page) : CA encaissé du mois (PAID/SHIPPED,
REFUNDED exclu — CA net ; date ≈ createdAt, même approximation que l'export CSV), file
« à expédier », stock faible (variantes actives ≤ 1), rétractations en cours, commandes
par statut, et **carte de franchise TVA** recâblée sur les SSOT
`getFranchiseThresholdCents()`/`getMajoredFranchiseThresholdCents()` (règle historique
respectée : le seuil de base n'annonce pas la conséquence du majoré).
`cacheDashboard(tag)` a retrouvé son consommateur ; profil `user`, tags admin partagés.

**Navigation sans lien mort** : item « Codes promo » et hub `marketing/` supprimés (le
modèle Discount n'existe pas dans le schéma lean), `ROUTES.ADMIN.{REFUNDS,STORE_CONFIG}`
supprimées, bloc « boutique fermée » du menu mobile retiré (sa prop n'était jamais
passée), patterns morts d'`admin-mobile-header` et labels morts de
`generate-breadcrumbs` purgés (+ label `retractations`).

**Emails** : 5 templates, 5 émetteurs, zéro mort. L'indirection
`modules/emails/constants/email.constants.ts` est supprimée (import direct de
`@/shared/lib/email-config`), `EMAIL_CONTACT` et les exports refund d'`email-colors`
purgés. `EMAIL_ADMIN_BCC` survit (branche BCC dormante — un futur émetteur d'alerte
admin la réactive telle quelle).

**`pnpm knip` PROPRE (zéro finding)** — le plus gros du lot :

- **modules entiers supprimés** : `modules/addresses/` (l'adresse est collectée chez
  Stripe — 21 fichiers), la chaîne `validate-cart` (`validate-cart.ts`,
  `get-variant-for-validation.ts`, `variant-validation.service.ts` — le checkout fait sa
  propre validation), les compteurs par statut (`get-{product,collection}-counts-by-status`),
  `get-collection-price-ranges`, et ~10 composants orphelins (multi-selects
  couleurs/matériaux, `cart-recommendations`, `purchase-tracker`, `logo-animated`…) ;
- **tags de cache orphelins purgés** (règle « un tag a un lecteur ET un mutateur ») :
  `VARIANT_STOCK` (son seul poseur était la chaîne validate-cart morte — 5 sites
  d'invalidation dans le vide), `PRODUCTS_CACHE_TAGS.COUNTS`,
  `COLLECTIONS_CACHE_TAGS.COUNTS`, et la sous-arborescence stock-invalidation morte
  (`getStockInvalidationTags`, `collectStockInvalidationTags`,
  `getVariantStockInvalidationTags`) qui n'était plus appelée que par ses tests ;
- **deps désinstallées** : `jspdf`, `embla-carousel-autoplay`, `@faker-js/faker`,
  `embla-carousel`. ⚠️ `@prisma/client` est un FAUX positif knip (le client généré
  résout ses types dessus — retiré puis restauré, tsc casse sans lui) : justifié dans
  `ignoreDependencies` de `knip.config.ts` ;
- ~55 exports/types dessexportés ou supprimés ; les gardés-délibérément portent un tag
  `@public` avec justification (knip l'honore) : `dataAccentForSlug`/`DataAccent`
  (refonte cartes collection), factories d'intégration (lot 7+).

**🐛 Bug PRÉEXISTANT corrigé (dormant depuis le lot 2)** : les formulaires
créer/modifier produit crashaient au navigateur (error boundary, zéro champ) —
`MediaArrayCard` pointait encore `fieldName="initialVariant.media"` /
`"defaultVariant.media"` alors que le média a déménagé à la racine (`media`) au lot 2 ;
TanStack Field lisait `undefined.length`. Invisible aux smokes HTTP (la page répondait
200, l'erreur vivait dans la frontière Suspense). Détecté par le clic-through
NAVIGATEUR (Playwright one-off) — les vérifs de statut ne suffisent pas, leçon pour le
lot 7.

**Clic-through** : les 34 routes admin vérifiées au HTTP avec cookie admin forgé
(toutes 200, aucun écran d'erreur), + dashboard et les 2 formulaires produit vérifiés
AU NAVIGATEUR (champs rendus, pas d'error boundary). `/admin/marketing` supprimée rend
le not-found (statut 200 streamé, comportement documenté au lot 5).

### État à la sortie du lot 7

**Suite Playwright refondée et VERTE en local, multi-navigateurs** : 1983 tests sur 9 projets
(chromium, firefox, webkit, mobile-chrome, mobile-webkit, tablet-portrait, tablet-landscape,
setup, authenticated-admin) — **1823 passed / 0 failed / 4 flaky (repêchés au retry, signalés)
/ 156 skipped en 10,3 min** (`pnpm e2e`, build de prod local). `pnpm validate` vert
(7290 tests unitaires). `retries: 1` en local (2 en CI) : sur ~1980 tests, la queue de flakes
de charge fait échouer 1-3 tests par run, jamais les mêmes (mesuré sur 12 runs complets) —
un repêché reste signalé « flaky », rien n'est masqué.

**Purge** : 24 specs de surfaces mortes supprimés (auth Better Auth, checkout Elements,
async-payment, payment-failure, guest-cart-merge, cron/, admin-refunds/discounts/shop-config/
order-lifecycle, factories/test-data, pages/auth.page). `auth.setup.ts` réécrit sur l'auth
maison (formulaire /admin/connexion, storageState).

**Nouveaux specs** : `checkout-hosted.spec.ts` (redirect checkout.stripe.com, extraction
cs_test, webhooks SIGNÉS `generateTestHeaderString` rejoués en POST direct — completed → PAID

- facture + confirmation + panier vidé ; expired → CANCELLED + restock + rejeu no-op ; timeout
  90s, vrais allers-retours Stripe), `retractation.spec.ts` (parcours public token HMAC),
  `admin-orders`/`admin-retractations` (workflows admin), `admin-login`, smoke = accueil → fiche
  → panier → redirect Stripe. Helpers : `helpers/db.ts` (Prisma direct),
  `helpers/stripe-webhook.ts` (payloads signés), `helpers/consent.ts` (pré-seed localStorage du
  consentement — le bandeau lazy recouvrait la bottom-nav mobile et faisait flapper les
  snapshots), `helpers/axe.ts` (reduced-motion + exclusion des focus guards Base UI).

**Environnement d'exécution** : suite contre BUILD DE PROD local (`pnpm build` + `pnpm start`,
le dev server sature sous les workers). Deux flags d'env opt-in, jamais actifs sans être posés :

- `E2E_ALLOW_SEED_IMAGES=1` (build-time, next.config.ts) — le seed picsum passe l'optimiseur ;
- `E2E_INSECURE_COOKIES=1` (runtime, SSOT `shared/lib/cookie-security.ts`, 7 écrivains) —
  WebKit REFUSE en silence un cookie `Secure` posé depuis http://localhost (Chromium
  l'accepte), ce qui rendait panier/favoris/session inertes sur les projets webkit
  (~30 specs rouges).

**🐛 Bugs PRODUIT corrigés (débusqués par la suite, invisibles aux tests unitaires)** :

1. **ConfirmDialog inerte au navigateur** : le Close Base UI avale la soumission native —
   preventDefault + requestSubmit (toutes les confirmations admin touchées ; JSDOM passait).
2. **Filtres couleur/matériau « 0 pièce »** : l'URL porte le slug, le SQL comparait le name —
   résolution slug→name (`modules/products/data/resolve-filter-slugs.ts`).
3. **Cartes OG paramétriques MORTES après incident** : sous charge longue, une instance
   satori/resvg avortée EMPOISONNE le process — toutes les cartes suivantes répondaient vides
   (« failed to pipe response » / « Input buffer contains unsupported image format ») jusqu'au
   redémarrage. Trois défenses : photo produit rapatriée en data-URI VALIDÉ avant Satori
   (`shared/components/og/fetch-og-image.ts`), rail OgShell en SVG inline (le décodage du
   data-URI `<img>` échouait en rendu runtime), et surtout `renderOgImage()`
   (`shared/components/og/render-og.tsx`) : pré-rendu en buffer DANS le handler (échec
   attrapable, contrairement au streaming) + carte générique pré-chauffée au chargement du
   module en repli — la route ne ferme plus jamais la connexion au crawler.
4. **WCAG 1.4.4 (zoom texte 200%)** : huit sources de scroll horizontal page entière
   corrigées — pastille quick-add (boîte de layout du centrage `left-1/2 -translate-x`
   comptée par scrollWidth → `inset-x` + flex), copie des étapes atelier (`break-words`),
   note en marge du polaroid (`overflow-x-clip` sur la section + cap `min(15rem,100%)`),
   groupe insécable du h1 héros (nbsp + `wrap-anywhere` au lieu de `whitespace-nowrap` —
   test silhouette amendé), h1 fiche (`wrap-anywhere` : `break-word` ne change pas le
   min-content d'un item flex), CTA héros et bouton « Ajouter au panier »
   (`whitespace-normal` + `max-w-full` : le socle Button pose nowrap), ligne « Fait main »
   (`flex-wrap`).
5. **WCAG 2.5.8** : pastille cliquable de la sidebar admin 20px → 24px (`target-size`
   échouait sur TOUTES les pages admin dès qu'une commande était en attente).
6. **Contrastes admin** : hint 3:4 (`/80` retiré), compteur médias (encre assombrie),
   Kbd ⌘S blanc sur bouton rose (encre primary-foreground).
7. **Checkbox de filtre sans nom accessible au SSR** : un `<label>` HTML ne nomme pas un
   `role="checkbox"` (span Base UI) et la liaison n'arrive qu'à l'hydratation —
   `aria-labelledby` déterministe posé dès le SSR (`checkbox-filter-item`).
8. **`.mov` accepté par le picker** : les deux `onPickerFiles` filtrent désormais
   `isValidMediaType` avant mise en file.

**Limites d'engins DOCUMENTÉES dans les specs (pas des bugs)** : politique Safari du Tab
(liens et boutons sautés — skips webkit sur skip-links/tab-order), Base UI ne rend pas le
focus au déclencheur à la fermeture sous WebKit (assertion gatée, à re-vérifier au bump de
`@base-ui/react`), Enter suit le lien du mega-menu sous Firefox (ArrowDown ouvre — pas de
perte WCAG 2.1.1), élection du porteur LCP spécifique Chromium, premier tap tactile =
ouverture du panneau (skips `isMobile` sur les tests « clic souris »).

**2 `test.fixme()` produits assumés** : étal mobile 7-12px sous le pli (arbitrage DA),
`sidebar_state` non relu au premier paint (PPR shell).

**Leçons re-utilisables** (chacune a coûté un run complet) : les listes admin cachées
(profil `user`) rendent invisible une ligne créée par Prisma → passer par `?search=` (clé de
cache neuve) ; `notFound()` streamé = contenu 404 sous HTTP 200 → asserter le CONTENU ; axe
photographie les fondus d'entrée → reduced-motion AVANT la navigation (pas seulement avant
l'audit — les staggers lisent la préférence au montage) ; un `.or()` non filtré casse en
strict mode dès qu'un état existe en double (mobile+desktop) ; un clic pré-hydratation part
dans le vide → toPass avec re-clic ; les données créées par un PROJET parallèle changent
l'UI d'un autre (badge sidebar, tables non vides, stock des cartes) → locators tolérants et
snapshots sans bandeau lazy ; les artefacts Playwright (rapport HTML, traces) doivent être
ignorés d'ESLint/Prettier, pas seulement de git.

### État à la sortie du lot 8

**`prisma/seed.ts` réécrit dans la langue de la marque** : 4 collections-territoires (Jardin
fantastique, Ciel cosmique, Arc-en-ciel liquide, Tableaux à porter), 9 couleurs (accents de
marque + turquoise/vert grappe/abricot du lexique), 7 matériaux VRAIS du § Produits & matières
(pas d'or fin ni d'argent 925), 8 types (les 7 slugs système + « Boucles d'oreilles », type
libre — les créoles étaient classées Colliers), **14 produits** narratifs de 12 à 45 €, chacun
≥ 1 variante, 8 pièces uniques (stock=1), multi-variantes sur tailles de bague et longueurs.
Visuels picsum stables seedés par slug ; les `alt` sont de VRAIS alt SEO descriptifs
(« chaîne de corps argentée gouttes de verre bijou de créatrice »). Idempotent par upsert
(médias/variantes resynchronisés en bloc).

⚠️ **L'ORDRE DE CRÉATION du tableau produits est PORTEUR** : le catalogue trie « plus récents
en premier », donc le DERNIER du tableau ouvre l'étal. Les pièces uniques sont créées en
premier — les e2e achètent le « premier produit » de l'étal, et une tête d'étal à stock=1 se
vidait sous les tests parallèles (mesuré : les tests panier échouaient sur « panier vide »).

**Vérifié** : `db:reset` + re-seed idempotent verts, boutique cohérente en dev, baselines
visuelles régénérées, **suite e2e complète 100 % verte sur le nouveau jeu** (1817 passed /
0 failed / 0 flaky, 9,8 min), `pnpm validate` vert.

**Inclus dans ce lot (reliquat de la traque OG du lot 7)** : la carte générique de partage
est FIGÉE en PNG embarqué (`shared/components/og/generic-card.generated.ts`) — le repli de
`renderOgImage()` rendu par le moteur vivant mourait AVEC le moteur (503 mesuré quand
l'empoisonnement précède le premier import des routes OG) ; le binaire, lui, survit à tout,
et l'erreur avalée est désormais journalisée. Les artefacts Playwright et `docs/prompts`
(brouillons édités à la main) sont exclus d'ESLint/Prettier.

### État à la sortie du lot 9 — migration terminée

**CLAUDE.md réécrit pour le nouveau monde** : 44 Ko contre 99 (−56 %). Conservés tels quels :
profil d'entreprise, lexique DA, conventions UI, règles React 19, matrice d'invalidation de
cache. Nouveaux : schéma lean (10 modèles), cycle de commande, auth maison, checkout hébergé,
facturation Int + suivi HMAC, rétractation, cartes OG résilientes, environnement e2e.
La note « migration en cours » du lot 0 est retirée.

**Sweep final** : les greps du prompt ne renvoient plus que des commentaires EXPLICATIFS
(« perte volontaire », « parti avec le schéma lean ») — plus aucun code vivant. Purgés dans ce
lot : `shared/types/rate-limit.types.ts` + `SEARCH_RATE_LIMITS` + le kind `"rate-limited"` et
ses branches UI, `shared/lib/stripe-idempotency.ts` (son seul appelant était
`initialize-payment`), `guest-session.ts` (zéro consommateur), les 5 scripts média de l'ancien
pipeline (`SkuMedia`/`blurDataUrl`) + leurs entrées package.json, les usines mortes de
`test/factories.ts` (réduit à 17 lignes), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` de
`.env.example`. ⚠️ `ProductType` est VIVANT (amendement lot 2) — le grep du prompt datait
d'avant l'amendement.

**docs/stripe re-curé** : manifeste réécrit pour le checkout hébergé — 5 bundles / 40 pages
(`01-checkout-sessions.md` remplace `01-payments` + `02-elements` + le `07` hors-manifeste ;
`04-refunds` sans disputes), chaque URL vérifiée en ligne (les variantes `?payment-ui=
stripe-hosted` rendent du contenu, l'URL nue rend un sommaire), INDEX.md aligné (le contract
test `stripe-docs-mirror` verrouille la parité), mirror régénéré (762 Ko).

**Décision claude-md-accuracy : NON recréé.** Le test mort au lot 0 vérifiait des ancres
`fichier:ligne` qui avaient TOUTES dérivé — c'est ce qui l'a tué. Le nouveau CLAUDE.md
n'emploie plus d'ancre de ligne, et ses invariants nommant un test sont vérifiables par grep.

**Gates** : `pnpm validate` vert, `pnpm knip` PROPRE (zéro finding), `pnpm build` vert,
`pnpm e2e` vert. `vercel.json` sans cron, la règle ESLint locale
`no-update-tag-outside-server-action` est branchée.

## 4. Schéma cible (SSOT)

⚠️ **Une seule retouche par rapport au schéma fourni** : le generator garde
`output = "../app/generated/prisma"` (valeur actuelle du repo). Le `../src/generated/prisma`
de la proposition supposait un dossier `src/` qui n'existe pas ici — l'alias TS est
`"@/*": ["./*"]` et tous les imports visent `@/app/generated/prisma/client`.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ------------------------------------------------------------
// RÉFÉRENTIELS GÉRÉS PAR LA CRÉATRICE (admin)
// ------------------------------------------------------------
model Collection {
  id          String  @id @default(cuid())
  slug        String  @unique
  name        String
  description String?
  position    Int     @default(0)
  active      Boolean @default(true)

  products Product[]
}

model Color {
  id       String  @id @default(cuid())
  name     String  @unique
  hex      String?
  position Int     @default(0)

  variants ProductVariant[]
}

model Material {
  id       String  @id @default(cuid())
  name     String  @unique
  position Int     @default(0)

  variants ProductVariant[]
}

// Amendement 2026-08-15 : conservé (cf. D2). Forme lean.
model ProductType {
  id       String @id @default(cuid())
  slug     String @unique
  label    String @unique
  position Int    @default(0)

  products Product[]
}

// ------------------------------------------------------------
// PRODUITS — pas de synchro catalogue Stripe : price_data inline
// ------------------------------------------------------------
model Product {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String
  priceCents  Int
  active      Boolean  @default(true)

  typeId String?
  type   ProductType? @relation(fields: [typeId], references: [id], onDelete: Restrict)

  media ProductMedia[]

  collections Collection[]

  // RÈGLE : chaque produit a AU MOINS UNE variante, même unique.
  // Le stock vit sur la variante, jamais sur le produit.
  variants ProductVariant[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orderItems OrderItem[]
}

model ProductVariant {
  id String @id @default(cuid())

  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  size String?

  colorId String?
  color   Color?  @relation(fields: [colorId], references: [id], onDelete: Restrict)

  materialId String?
  material   Material? @relation(fields: [materialId], references: [id], onDelete: Restrict)

  // null = prix du produit ; sinon prix propre à la variante
  priceCents Int?

  stock  Int     @default(1)
  active Boolean @default(true)

  orderItems OrderItem[]

  @@unique([productId, size, colorId, materialId])
  @@index([colorId])
  @@index([materialId])
}

model ProductMedia {
  id String @id @default(cuid())

  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  type MediaType @default(IMAGE)
  url  String
  alt  String?

  // position 0 = média principal (liste boutique + session Stripe Checkout)
  position Int @default(0)

  createdAt DateTime @default(now())

  @@index([productId, position])
}

enum MediaType {
  IMAGE
  VIDEO
}

// ------------------------------------------------------------
// COMMANDES — guest checkout, adresse collectée par Stripe
// ------------------------------------------------------------
model Order {
  id String @id @default(cuid())

  // Séquentiel sans trou, attribué au paiement confirmé (webhook)
  invoiceNumber Int? @unique

  status OrderStatus @default(PENDING)

  stripeSessionId       String  @unique
  stripePaymentIntentId String? @unique

  amountItemsCents    Int
  amountShippingCents Int @default(0)
  amountTotalCents    Int

  email           String
  customerName    String?
  shippingLine1   String?
  shippingLine2   String?
  shippingZip     String?
  shippingCity    String?
  shippingCountry String?

  shippedAt      DateTime?
  trackingNumber String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items        OrderItem[]
  retractation RetractationRequest?

  @@index([email])
}

enum OrderStatus {
  PENDING   // session Checkout créée → stock RÉSERVÉ (décrémenté)
  PAID      // webhook checkout.session.completed (payment_status=paid)
  SHIPPED
  REFUNDED
  CANCELLED // webhook checkout.session.expired → RESTITUER le stock
}

model OrderItem {
  id String @id @default(cuid())

  orderId String
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  productId String?
  product   Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)

  nameSnapshot    String
  variantSnapshot String?
  unitPriceCents  Int
  quantity        Int     @default(1)

  @@index([orderId])
  @@index([productId])
  @@index([variantId])
}

// ------------------------------------------------------------
// RÉTRACTATION (obligation légale depuis le 19 juin 2026)
// ------------------------------------------------------------
model RetractationRequest {
  id String @id @default(cuid())

  orderId String @unique
  order   Order  @relation(fields: [orderId], references: [id])

  reason String?

  status RetractationStatus @default(RECEIVED)

  requestedAt    DateTime  @default(now())
  acknowledgedAt DateTime?
  itemReceivedAt DateTime?
  refundedAt     DateTime?

  stripeRefundId String?

  creditNoteNumber Int? @unique
}

enum RetractationStatus {
  RECEIVED
  ACKNOWLEDGED
  AWAITING_RETURN
  REFUNDED
  REJECTED
}
```

---

# Les prompts

## Lot 0 — Préparation du terrain (S)

```text
Tu prépares une migration lourde du repo Synclune (e-commerce Next.js 16 / Prisma 7 / Stripe)
vers un schéma Prisma simplifié. Lis d'abord docs/MIGRATION-PROMPTS.md §§ 0-4 : décisions
actées, pertes volontaires, conventions, schéma cible. Ce lot ne casse rien — il démine.

## Préconditions (si KO : STOP et signale, ne répare rien)
- `git status` propre, branche `main` à jour.
- `pnpm validate` vert.

## À faire
1. Crée une branche `migration-lean` et un tag de sauvegarde `pre-migration-lean` sur main.
   Tout le chantier (lots 0 à 9) vit sur cette branche.
2. Supprime les deux contract tests « méta » qui deviendraient menteurs dès les lots suivants :
   - test/contract/claude-md-accuracy.contract.test.ts
   - test/contract/schema-migration-parity.contract.test.ts
3. Ajoute en TÊTE de CLAUDE.md (juste après le titre) un encadré court : « ⚠️ MIGRATION EN
   COURS vers le schéma lean — voir docs/MIGRATION-PROMPTS.md. En cas de conflit entre ce
   fichier et le document de migration, le document de migration gagne. » C'est la SEULE
   retouche de CLAUDE.md autorisée avant le lot 9.
4. Vérifie que la suppression du test claude-md-accuracy ne laisse pas de référence morte
   (grep "claude-md-accuracy" dans le repo).

## Interdits
- Ne touche à rien d'autre : pas de schema.prisma, pas de modules, pas de proxy.ts.

## Done
1. `pnpm validate` vert.
2. Ligne « Lot 0 » du tableau de suivi de docs/MIGRATION-PROMPTS.md cochée (statut ✅ + commit).
3. Commit unique `migration(lot-0): préparation du terrain`. Ne pousse pas sans demande.
```

## Lot 1 — Auth maison, purge Better Auth (L)

```text
Tu remplaces Better Auth par une auth admin minimale dans le repo Synclune. Lis d'abord
docs/MIGRATION-PROMPTS.md §§ 0-3 (décisions D3, pertes volontaires, conventions).

## Contexte
Il n'y a plus de compte client depuis 2026-07-31 : la SEULE personne qui se connecte est
l'administratrice (Léane). Better Auth (36 fichiers dans modules/auth/, 4 tables Prisma) est
surdimensionné. Cible : mot de passe unique en env + cookie signé, ZÉRO table en base.
⚠️ 414 fichiers référencent @/modules/auth ou requireAdmin — c'est l'onde de choc du lot.

## Préconditions (si KO : STOP)
- Branche `migration-lean`, `git status` propre, `pnpm validate` vert, lot 0 coché au § 3.

## Spécifications du nouveau module `modules/admin-auth/`
- `login(password)` : Server Action qui compare (timingSafeEqual) le mot de passe soumis à
  `process.env.ADMIN_PASSWORD`, puis pose un cookie `admin_session` httpOnly + secure +
  sameSite=lax, valeur = `<expiry>.<hmac>` signée HMAC-SHA256 avec `process.env.AUTH_SECRET`,
  durée 7 jours. `logout()` supprime le cookie.
- `requireAdmin()` : GARDE LE MÊME NOM et un contrat compatible avec l'existant (retourne
  `{ error }` exploitable par les Server Actions comme aujourd'hui) ; vérifie signature + expiry
  du cookie. Ajoute `requireAdminApiRoute()` (variante Response) et `isAdmin()` (booléen) sur le
  même modèle — regarde leurs usages actuels dans modules/auth/lib/require-auth.ts et
  modules/auth/utils/guards.ts pour reproduire les signatures utilisées.
- Page de connexion : app/admin/connexion (un champ mot de passe). app/(auth)/ disparaît.
- `assertAdminPage()` (garde des pages admin) est conservé mais réimplémenté sur le cookie.

## À faire
1. Crée modules/admin-auth/ (lib + actions + composant formulaire + tests unitaires du HMAC
   et de l'expiry).
2. Codemod des imports : remplace les imports @/modules/auth/... par @/modules/admin-auth/...
   sur les 3 helpers survivants (requireAdmin, requireAdminApiRoute, isAdmin) + assertAdminPage.
   Les AUTRES exports de modules/auth (requireAuth, requireAdminWithUser,
   requireActiveAccountIfAuthenticated, isVerifiedAdmin, getSession…) n'ont plus de raison
   d'être : chaque call site se règle soit en requireAdmin/isAdmin, soit en suppression de la
   branche session (le parcours d'achat est 100 % invité).
3. Supprime : modules/auth/ entier, app/(auth)/ entier, app/api/auth/, la config Better Auth
   (better-auth dans package.json, shared/lib si config partagée), les emails d'auth
   (verification-email, password-reset-email dans emails/ et modules/emails/auth-emails).
4. proxy.ts : retire les routes d'auth supprimées (/connexion, /mot-de-passe-oublie,
   /reinitialiser-mot-de-passe, /renvoyer-verification, /verifier-email), ajoute
   /admin/connexion. Le default-deny doit continuer de protéger /admin.
5. package.json : retire `modules/auth` du script test:critical ; aligne le grep de
   .husky/pre-commit (même liste).
6. Tests : supprime les suites de modules/auth ; ADAPTE test/contract/
   admin-actions-require-admin.contract.test.ts (il doit continuer d'exiger requireAdmin dans
   chaque action admin — c'est le filet qui rend ce lot sûr) ; adapte l'allowlist de
   server-action-input-validation.contract.test.ts si elle cite des actions d'auth supprimées.
7. .env.example (ou équivalent) : documente ADMIN_PASSWORD et AUTH_SECRET.

## Interdits
- NE TOUCHE PAS à prisma/schema.prisma : les tables User/Session/Account/Verification restent
  orphelines en base jusqu'au lot 2. Ne les « nettoie » pas en passant.
- Ne restaure rien de la liste « Pertes volontaires » (§ 1).
- e2e/ : hors périmètre. auth.setup.ts et auth.spec.ts vont casser — neutralise-les au besoin
  (skip), ne les répare pas (lot 7).

## Pièges
- requireAdmin est cité par ~400 fichiers : préfère un codemod mécanique (sed/grep) vérifié par
  tsc à des éditions manuelles.
- Le cookie signé n'a AUCUNE révocation serveur : c'est assumé (une seule utilisatrice, expiry
  7 j, rotation = changer AUTH_SECRET). Ne réintroduis pas de table Session.
- Plusieurs data/ passent `{ isAdmin: false }` dans des scopes "use cache" : ce paramètre
  survit tel quel, seul le résolveur change.

## Done
1. `pnpm validate` vert.
2. Vérification manuelle : `pnpm dev`, /admin redirige vers /admin/connexion sans cookie ;
   connexion avec ADMIN_PASSWORD ouvre le dashboard ; mauvais mot de passe refusé.
3. `grep -r "better-auth" --include="*.ts*" .` (hors node_modules, hors docs) ne renvoie rien.
4. Ligne « Lot 1 » cochée au § 3. Commit unique `migration(lot-1): auth admin maison, purge
   Better Auth`. Ne pousse pas.
```

## Lot 2 — Bascule schéma : nouveau baseline, purge, adaptation catalogue (XL)

```text
Tu bascules le repo Synclune sur le nouveau schéma Prisma « lean » (9 modèles). Lis d'abord
docs/MIGRATION-PROMPTS.md §§ 0-4 — le § 4 contient le schéma cible EXACT à installer (avec son
generator déjà corrigé pour ce repo).

## Contexte
C'est le lot le plus lourd. À la fin : le schéma cible est en place, TOUT compile, le catalogue
(produits, variantes, médias, couleurs, matériaux, collections, panier, favoris) fonctionne en
dev. Le commerce (checkout, webhooks, admin commandes, dashboard) est STUBBÉ — réécrit aux lots
3-6. « Vert » signifie « compile et tests verts », pas « fonctionnel de bout en bout ».
La base est JETABLE : aucune donnée à préserver (décision D1).

## Préconditions (si KO : STOP)
- Branche `migration-lean`, `git status` propre, `pnpm validate` vert, lots 0-1 cochés au § 3.
- DATABASE_URL pointe une base de dev jetable (vérifie que l'URL ne contient pas "prod").

## Ordre impératif
1. SAUVETAGE AVANT PURGE : copie la logique de
   modules/refunds/services/return-eligibility.service.ts (+ son test) vers
   modules/orders/services/retractation-eligibility.service.ts. C'est la fenêtre légale de
   rétractation (14 j après livraison) — elle resservira au lot 5. Adapte ses entrées au futur
   schéma (elle lira shippedAt à défaut de deliveredAt, qui disparaît).
2. SCHÉMA : remplace prisma/schema.prisma par le schéma cible du § 4, à l'identique.
   Supprime prisma/migrations/ EN ENTIER (0_init compris — la base est jetable, l'interdit
   historique de toucher 0_init ne s'applique plus puisqu'on repart de zéro),
   prisma/migrations-archive/, prisma/sql/raw-guards.sql et leurs références
   (prisma.config.ts : shadowDatabaseUrl peut rester ; test/integration/setup.ts :
   RAW_SQL_GUARD_MIGRATIONS disparaît). Puis :
   `pnpm prisma migrate reset --force` (si la base existe) et
   `pnpm prisma migrate dev --name init` → NOUVEAU baseline unique.
   Conserve la convention down.sql si le contract test qui l'exigeait a survécu — sinon
   supprime-la avec lui (schema-migration-parity est déjà parti au lot 0).
3. SUPPRESSIONS de modules entiers (et leurs routes/admin/navigation/proxy.ts) :
   - modules/product-types/ + app/(shop)/produits/[productTypeSlug]/ (vérifie le nom exact) +
     app/admin/catalogue/types-de-produits/
   - modules/invoices/ + app/api/orders/[orderNumber]/invoice/ + credit-note/ +
     app/admin/ventes/facturation/
   - modules/refunds/ (le sauvetage de l'étape 1 est fait) + app/admin/ventes/remboursements/
   - modules/store-settings/ + app/admin/configuration/boutique/
   - modules/cron/ + app/api/cron/ + les 3 entrées "crons" de vercel.json +
     app/admin/configuration/maintenance/
   - app/admin/configuration/securite/ (révocation de sessions : plus de sessions en base)
   - shared/lib/rate-limit* + shared/lib/rate-limit-config.ts + les enforceRateLimit* dans
     shared/lib/actions/ (perte volontaire § 1) — retire leurs appels des actions survivantes.
   - modules/taxonomies/ : socle UI partagé colors/materials/product-types. Trie : garde ce que
     colors/ et materials/ consomment encore, supprime le reste.
4. STUBS (compilent, ne font rien d'utile — listés dans ton rapport de fin) :
   - modules/payments/ : vide le module à l'exception d'un fichier placeholder ; app/paiement/
     rend une page « paiement indisponible pendant la migration ».
   - modules/webhooks/ : app/api/webhooks/stripe/route.ts vérifie la signature puis répond 200
     sans rien traiter (commentaire TODO lot 3) ; supprime handlers/, event-registry, services
     liés à PaymentIntent/Refund/Dispute. Garde alert.service.ts si des survivants l'utilisent.
   - modules/dashboard/ : les KPI qui lisent Refund/OrderHistory/invoice rendent 0 ou « — »
     (TODO lot 6).
   - modules/orders/ : garde les types/le socle, stubbe les actions admin qui référencent des
     colonnes disparues (TODO lot 4). Le suivi-commande (app/suivi-commande) peut rester stubbé.
5. ADAPTATION catalogue au nouveau schéma :
   - modules/skus/ → modules/variants/ : renomme le dossier et TOUTES les occurrences
     (prisma.productSku → prisma.productVariant, types, admin
     app/admin/catalogue/produits/[slug]/variantes en cohérence). Champs : inventory → stock,
     priceInclTax (euros décimaux) → priceCents (centimes, Int), isActive → active, sku/
     compareAtPrice/position/deletedAt disparaissent.
   - modules/products/ : title → name, status PublicationStatus → active Boolean (PUBLIC ⇔
     active=true ; DRAFT/ARCHIVED ⇔ false), prix produit priceCents ajouté, deletedAt disparaît
     (suppression = delete réel, Restrict sur les référentiels, SetNull sur OrderItem).
   - modules/media/ : SkuMedia → ProductMedia rattaché au PRODUIT. La galerie et la vignette
     déménagent du SKU vers le produit ; pickPrimaryImage() garde sa règle (première IMAGE de
     l'ordre position asc — le filtre mediaType reste OBLIGATOIRE, une vidéo peut occuper la
     position 0). thumbnailUrl/blurDataUrl/width/height disparaissent : adapte les composants.
   - modules/colors/ + modules/materials/ : M-N (ProductSkuColor/Material) → FK 1-N sur la
     variante (colorId/materialId simples). slug et isActive disparaissent de Color/Material :
     l'identité est name, l'ordre est position. onDelete: Restrict = la suppression d'une
     couleur utilisée échoue → l'admin doit réaffecter d'abord (message d'erreur clair).
   - modules/collections/ : ProductCollection (join explicite avec position/vedette) → M-N
     implicite Prisma. La notion de « produit vedette d'une collection » disparaît ; status →
     active ; description reste.
   - modules/cart/ + modules/wishlist/ : cookies inchangés, mais les ids stockés sont désormais
     des ids de ProductVariant ; adapte fetchCartSkus & co (noms et selects).
   - Les selects Prisma du catalogue restent dans les fichiers constants/ des modules
     (convention conservée) — mets-les à jour vers les nouveaux modèles.
6. SEED minimal : réécris prisma/seed.ts pour le nouveau schéma (2-3 collections, quelques
   couleurs/matériaux, 4-5 produits avec variantes et médias). Qualité DA au lot 8 — ici il
   doit juste passer.
7. TESTS — purge nominative dans test/contract/ :
   - SUPPRIME : sku-variant-identity-guard, catalog-type-redirect, restock-reactivation-guard,
     order-action-enum-coverage, stripe-events.test.ts (fixtures payment_intent.* — réécrit au
     lot 3), server-action-copy-voice si son inventaire cite majoritairement des actions mortes
     (sinon adapte).
   - ADAPTE : prisma-config, zod-prisma-length-parity (plus aucune colonne VarChar(n) dans le
     nouveau schéma → le test peut devenir trivial ou partir, à toi de juger et de le dire),
     read-queries-schema-validity, transactional-writes-schema-validity,
     admin-actions-require-admin, server-action-input-validation (allowlists).
   - GARDE : brand-lexicon, react-compiler-lint-rules, cache-invalidation-context,
     fonts-docs-parity, stripe-docs-mirror.
   - Dans modules/ : supprime les suites des modules supprimés ; adapte celles du catalogue.
     Tout test de regression qui verrouille une perte volontaire (§ 1) se SUPPRIME (ex :
     server-actions-rate-limited, cron-*, vat-*, no-manual-invoice-creation,
     order-history-immutability, order-snapshot-column-parity…).
8. package.json : test:critical devient
   `vitest run modules/cart modules/orders modules/payments modules/webhooks
   modules/admin-auth app/api/webhooks/stripe test/contract` ; aligne .husky/pre-commit.
   Retire les scripts morts (docs:stripe reste). knip.config : purge des chemins morts.

## Interdits
- Ne restaure RIEN du § 1 (notamment : pas de table d'idempotence webhook, pas de
  PublicationStatus, pas de soft delete, pas de rate limiting).
- Ne réécris PAS le checkout ni les webhooks (lot 3) — stubs seulement.
- CLAUDE.md gelé. e2e/ hors périmètre (rouge assumé).

## Pièges
- pnpm validate lance TOUS les vitest y compris test/contract/ : chaque invariant abandonné
  laissé testé = rouge. La purge de l'étape 7 est aussi importante que le code.
- Le hook pre-commit lance test:critical si tu commits des fichiers de modules critiques : mets
  package.json et .husky/pre-commit à jour AVANT le commit final.
- prisma generate : le client généré vit dans app/generated/prisma (gitignoré) — un artefact
  périmé (ex. models/CheckoutReservation.ts d'un ancien plan) disparaît à la régénération.
- Les montants passent d'euros décimaux à des CENTIMES Int : traque tous les formatages
  (shared/utils currency) et les comparaisons de prix du panier (priceAtAdd du cookie cart —
  convertis le témoin en centimes, il reste un témoin d'affichage, jamais une base de calcul).
- proxy.ts est default-deny : chaque route supprimée doit sortir de ses listes, sinon liens
  morts silencieux ; la route /collections et la navigation vers elle SURVIVENT.

## Done
1. `pnpm validate` vert ; `pnpm prisma migrate status` propre (1 migration : init).
2. `pnpm seed` passe ; `pnpm dev` : la boutique (accueil, /creations, fiche produit, panier,
   favoris) et l'admin catalogue (produits, variantes, couleurs, matériaux, collections)
   fonctionnent. /paiement affiche le placeholder.
3. Rapport de fin : liste des surfaces stubbées (reprises lots 3-6) et des tests supprimés.
4. Ligne « Lot 2 » cochée au § 3 (note les stubs). Commit unique
   `migration(lot-2): bascule schéma lean, purge et adaptation catalogue`. Ne pousse pas.
```

## Lot 3 — Checkout Stripe hébergé + webhooks (L)

```text
Tu réécris le paiement de Synclune sur Stripe Checkout HÉBERGÉ. Lis d'abord
docs/MIGRATION-PROMPTS.md §§ 0-4 (décisions D4-D5, schéma cible § 4 : modèles Order/OrderItem
et cycle PENDING→PAID / expired→CANCELLED).

## Contexte
L'ancien tunnel (PaymentIntent + Elements, page maison) a été supprimé/stubbé au lot 2. Cible :
une Server Action createCheckoutSession + redirect vers la page Stripe, deux webhooks. Le stock
est réservé à la création de session (décrément), rendu à l'expiration.

## Préconditions (si KO : STOP)
- Branche `migration-lean`, git propre, `pnpm validate` vert, lots 0-2 cochés au § 3.
- STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET présents en env de dev.

## Spécifications
1. Action `createCheckoutSession` (modules/payments/actions/) :
   - Lit le panier cookie, revalide CHAQUE ligne en base (variante active, produit actif,
     stock suffisant, prix courant en centimes — le priceAtAdd du cookie n'est qu'un témoin).
   - Transaction Prisma : décrémente le stock de chaque variante en
     `updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })`
     et VÉRIFIE le count retourné (count ≠ attendu → rollback + erreur « stock insuffisant »).
     Jamais de read-then-write : les bijoux sont souvent stock=1.
   - Crée l'Order PENDING dans la MÊME transaction : items avec snapshots (nameSnapshot,
     variantSnapshot au format « Doré · 18 cm · Turquoise » — n'inclut que les axes non null —,
     unitPriceCents, quantity), amountItemsCents/amountShippingCents/amountTotalCents.
   - Crée la session Stripe : mode payment, line_items en price_data inline (currency "eur" en
     dur, product_data.name + première image du produit si IMAGE), shipping_address_collection
     (allowed_countries : FR + les 26 autres États UE + MC — reprends la liste SSOT de
     shared/constants/countries s'il en reste une), shipping_options pour les frais de port
     (reprends la logique de modules/orders/services/shipping.service.ts si elle a survécu au
     lot 2, sinon un forfait simple — note le choix dans le rapport), customer_email si connu,
     expires_at = now + 30 min (minimum Stripe ; borne 30 min–24 h, non modifiable après
     création), metadata.orderId, success_url = /paiement/retour?session_id={CHECKOUT_SESSION_ID},
     cancel_url = /paiement/annulation.
   - Écrit session.id dans Order.stripeSessionId puis redirect(session.url). ⚠️ Ordre : crée
     l'Order d'abord avec un stripeSessionId temporaire ? NON — crée la session Stripe AVANT la
     transaction si tu as besoin de l'id, ou après avec un update ; choisis le chemin qui
     garantit : jamais d'Order sans stripeSessionId final, jamais de décrément sans Order.
     Recommandation : transaction (stock + Order avec placeholder unique) → création session
     Stripe → update stripeSessionId ; si Stripe échoue, rollback compensatoire (restock +
     delete Order) dans un try/catch.
2. Webhook (app/api/webhooks/stripe/route.ts + modules/webhooks/) :
   - Vérification de signature obligatoire (constructEvent), 400 si invalide.
   - `checkout.session.completed` (payment_status=paid) : retrouve l'Order par stripeSessionId ;
     transition PENDING→PAID en `updateMany({ where: { stripeSessionId, status: "PENDING" },
     data: { status: "PAID", stripePaymentIntentId, email, customerName, shipping* } })` —
     count=0 = déjà traité (redélivrance) → 200 silencieux. C'est CETTE garde de transition qui
     porte l'idempotence (il n'y a plus de table WebhookEvent — perte volontaire). L'adresse et
     l'email viennent de la session Stripe (customer_details, collected_information/
     shipping_details selon la version d'API — vérifie sur la doc Stripe locale docs/stripe/ ou
     en ligne, ne devine pas les chemins de champs).
   - Envoie l'email de confirmation de commande (module emails existant, adapté) APRÈS la
     transition réussie — l'idempotence de l'email est portée par idempotencyKey Resend
     `order-confirm-<orderId>` (mécanisme existant).
   - `checkout.session.expired` : transition PENDING→CANCELLED en updateMany (même garde) +
     restock des items dans la même transaction (increment par variantId — via la relation
     OrderItem, en ignorant les variantId null). Exactement une fois grâce au count.
   - Toute erreur de traitement → 500 (Stripe redélivre pendant 3 jours). Pas de système de
     retry maison.
3. Pages app/paiement/ :
   - page.tsx : plus de formulaire — un bouton/flux qui appelle createCheckoutSession depuis le
     panier (ou la page disparaît au profit d'un CTA panier → à toi de choisir le plus simple,
     note-le).
   - retour/ : landing success_url — lit session_id, affiche la confirmation (retrouve l'Order
     par stripeSessionId ; si le webhook n'est pas encore passé, affiche « paiement en cours de
     confirmation » avec refresh — ne crée RIEN ici, le webhook est le seul écrivain).
     Vide le panier cookie au montage (clearCartAfterOrder, mécanisme existant).
   - annulation/ : message + retour panier (le panier n'est PAS vidé ; le stock se libère à
     l'expiration de la session, affiche-le honnêtement : « ta réservation expire dans ~30 min »).
4. Fenêtre de réservation orpheline : si le webhook expired n'arrive jamais (perdu au-delà des
   3 j de redélivrance), du stock reste réservé. Pas de cron (perte volontaire) : ajoute un
   bouton admin « Vérifier les commandes en attente » (liste les Order PENDING de plus de 24 h,
   interroge l'API Stripe checkout.sessions.retrieve, applique completed/expired selon l'état
   réel). Simple, actionné à la main par Léane.

## Tests
- Unitaires : décrément atomique (count mismatch → rollback), garde de transition (2e webhook
  completed = no-op), restock exactement-une-fois, construction des line_items/snapshots.
- Contract : recrée test/contract/stripe-events sur les 2 events checkout.session.* (fixtures
  via `stripe trigger checkout.session.completed --print-json`).
- e2e : hors périmètre (lot 7).

## Interdits
- Ne réintroduis RIEN du § 1 : pas de WebhookEvent, pas de rate limiting, pas de PaymentIntent
  côté client, pas de page de paiement maison.
- Pas de création de facture ici (invoiceNumber = lot 4).

## Pièges
- Server Action = endpoint RPC public : createCheckoutSession valide son entrée (Zod) et ne
  fait confiance à AUCUN montant venant du client — tout se recalcule en base.
- redirect() de Next throw en interne : ne l'enveloppe pas dans le try/catch du rollback.
- Invalidation de cache : contexte webhook = revalidateTag(tag, { expire: 0 }) — jamais
  updateTag (il throw hors Server Action). La matrice contexte→API de CLAUDE.md reste vraie.
- Les montants Stripe sont déjà en centimes : aucun ×100 sur les champs *Cents.

## Done
1. `pnpm validate` vert.
2. Parcours réel en dev : `pnpm dev` + `stripe listen --forward-to
   localhost:3000/api/webhooks/stripe`, achat test carte 4242… → Order PENDING créé avec stock
   décrémenté → webhook → PAID + email ; rejeu du webhook (stripe events resend) → no-op ;
   session expirée (ou trigger expired) → CANCELLED + stock restauré.
3. Ligne « Lot 3 » cochée au § 3 (note le choix frais de port et le CTA panier). Commit unique
   `migration(lot-3): checkout Stripe hébergé + webhooks`. Ne pousse pas.
```

## Lot 4 — Commandes : admin, facturation Int, suivi client (L)

```text
Tu refais la gestion des commandes de Synclune sur le schéma lean. Lis d'abord
docs/MIGRATION-PROMPTS.md §§ 0-4 (schéma § 4 : Order/OrderItem, enum OrderStatus à 5 états).

## Contexte
Le checkout (lot 3) crée des Orders et les passe PAID via webhook. Il faut maintenant :
l'attribution du numéro de facture, l'admin commandes (liste, détail, expédition), le suivi
client. L'ancien module orders/ (128 fichiers) portait facturation PDF, avoirs, OrderHistory,
statuts riches — tout ça est une perte volontaire (§ 1) : le nouveau périmètre est PETIT.

## Préconditions (si KO : STOP)
- Branche `migration-lean`, git propre, `pnpm validate` vert, lots 0-3 cochés au § 3.

## Spécifications
1. invoiceNumber (Int séquentiel sans trou, obligation légale) :
   - Attribué à la transition PENDING→PAID : étends la transaction du webhook completed
     (lot 3) — dans la MÊME transaction Prisma que le updateMany de transition, calcule
     `(max(invoiceNumber) ?? 0) + 1` et écris-le. Concurrence : @unique → P2002 possible si
     deux webhooks passent en même temps ; retry borné (3 tentatives) de la transaction sur
     P2002. Pas d'advisory lock, pas de format F-YYYY : un Int nu, comme le schéma le dit.
   - AUCUNE Server Action n'écrit invoiceNumber (le webhook est le seul écrivain).
   - Pas de PDF : la « facture » est une page/un email récapitulatif rendu depuis l'Order
     (numéro, date, lignes snapshots, totaux, mention « TVA non applicable, art. 293 B du
     CGI » — reprends la SSOT DEFAULT_FRANCHISE_VAT_MENTION si elle a survécu, sinon recrée la
     constante dans shared/constants/). Impression = window.print / rendu HTML propre.
2. Admin commandes (app/admin/ventes/commandes) :
   - Liste : filtres par status (5 états), recherche par email/numéro, tri par date.
   - Détail : lignes (snapshots UNIQUEMENT — ne re-joins jamais le produit vivant pour
     afficher un montant ou un nom ; les FK productId/variantId ne servent qu'à des liens de
     navigation, nullables par SetNull), adresse, totaux, statut.
   - Actions : « Marquer expédiée » (PAID→SHIPPED, pose shippedAt + trackingNumber, envoie
     l'email d'expédition existant adapté), « Annuler » (PENDING→CANCELLED + restock, même
     mécanique que le webhook expired). Transitions en updateMany avec garde du statut source ;
     REFUNDED appartient au lot 5.
3. Suivi client (app/suivi-commande) : réactive la page sur le nouveau schéma. L'accès reste
   par lien tokenisé HMAC envoyé dans l'email de confirmation (mécanisme buildOrderTrackingUrl
   existant — adapte-le : le token signe l'id/numéro de commande + email). Affiche statut,
   lignes, tracking. C'est le SEUL accès client à une commande.
4. Emails : adapte order-confirmation (déjà branché lot 3) et shipping-confirmation aux
   nouveaux champs ; supprime les templates morts restants (refund-confirmed part au lot 5 s'il
   est réutilisable, sinon supprime-le ici et le lot 5 recréera le sien).
5. Export livre de recettes (obligation micro-entreprise, art. 50-0 CGI) : conserve/réécris
   app/api/admin/orders/export en CSV minimal — commandes PAID/SHIPPED/REFUNDED avec date de
   paiement (updatedAt de la transition PAID ou un champ dérivé — au plus simple : la date
   Stripe n'étant plus stockée, utilise la date de passage PAID via updatedAt et note la
   limite), numéro de facture, total. Garde requireAdminApiRoute.

## Tests
- Unitaires : séquence invoiceNumber (concurrence simulée → retry P2002, pas de trou), gardes
  de transition (SHIPPED impossible depuis PENDING…), restock d'annulation, token HMAC du
  suivi (signature invalide → 404).
- Adapte les suites survivantes de modules/orders ; supprime celles qui testent des surfaces
  mortes.

## Interdits
- Rien du § 1 : pas d'OrderHistory, pas de PDF archivé, pas d'avoir ici, pas de F-YYYY-NNNNN,
  pas de création manuelle de commande payée (pas de « vente en caisse »).

## Pièges
- max+1 sous transaction sérialisable simple suffit à ~20 commandes/mois — n'invente pas plus
  robuste que le retry P2002.
- Les montants sont des CENTIMES Int : formate via l'utilitaire currency adapté au lot 2.
- updateTag pour les Server Actions admin, revalidateTag({ expire: 0 }) côté webhook — la
  matrice contexte→API tient toujours.

## Done
1. `pnpm validate` vert.
2. Parcours dev : achat test → PAID avec invoiceNumber=1 ; second achat → 2 ; expédition
   depuis l'admin → email + tracking visibles sur le suivi client ; annulation d'une PENDING →
   restock ; export CSV télécharge.
3. Ligne « Lot 4 » cochée au § 3. Commit unique
   `migration(lot-4): commandes admin, facturation Int, suivi client`. Ne pousse pas.
```

## Lot 5 — Rétractation : `RetractationRequest` (M)

```text
Tu implémentes la rétractation en ligne de Synclune (obligation légale depuis le 19 juin
2026 : le client doit pouvoir se rétracter via une fonctionnalité en ligne accessible, avec
accusé de réception sans délai). Lis d'abord docs/MIGRATION-PROMPTS.md §§ 0-4 (schéma § 4 :
RetractationRequest, 5 statuts).

## Préconditions (si KO : STOP)
- Branche `migration-lean`, git propre, `pnpm validate` vert, lots 0-4 cochés au § 3.

## Spécifications
1. Formulaire public : depuis la page de suivi de commande (lot 4, accès par token HMAC — pas
   de nouveau chemin d'accès), un bouton « Me rétracter » ouvre un formulaire (motif OPTIONNEL —
   le client n'a pas à se justifier). Éligibilité : fenêtre de 14 jours après réception, via la
   logique transplantée au lot 2 (modules/orders/services/retractation-eligibility.service.ts,
   ancrée sur shippedAt + délai d'acheminement à défaut de date de livraison). Hors fenêtre : le
   formulaire reste SOUMETTABLE (c'est un droit de demande) mais l'admin verra « hors délai » et
   pourra rejeter (REJECTED).
2. Création : Server Action publique (validation Zod, token de suivi exigé — pas d'accès par
   simple orderId, c'est la garde anti-énumération) ; crée la RetractationRequest (RECEIVED,
   @unique sur orderId → une seule demande par commande, P2002 = « demande déjà enregistrée »).
   Envoie IMMÉDIATEMENT l'accusé de réception par email (template neuf, idempotencyKey Resend
   `retractation-ack-<orderId>`) et pose acknowledgedAt + status ACKNOWLEDGED dans la foulée
   (l'accusé est automatique — RECEIVED n'est un état intermédiaire que si l'envoi échoue).
3. Workflow admin (nouvelle page app/admin/ventes/retractations) :
   - Liste + détail (commande liée, motif, dates, éligibilité calculée).
   - Actions : « Colis reçu » (→ AWAITING_RETURN puis itemReceivedAt — ou directement
     itemReceivedAt sur AWAITING_RETURN, modélise les 2 transitions ACKNOWLEDGED→
     AWAITING_RETURN→REFUNDED simplement), « Rembourser » : stripe.refunds.create({
     payment_intent: order.stripePaymentIntentId }) → stocke stripeRefundId, refundedAt,
     status REFUNDED, Order.status → REFUNDED, attribue creditNoteNumber (Int séquentiel
     DISTINCT du compteur facture : max+1 sur RetractationRequest.creditNoteNumber, même
     mécanique retry P2002 que le lot 4) ; « Rejeter » (→ REJECTED, motif requis côté admin,
     email d'information).
   - Remboursement sous 14 jours max après la demande : affiche un compteur/alerte visuelle
     dans la liste (pas de cron — perte volontaire).
   - Restock : PAS automatique. Un bijou retourné n'est pas forcément revendable — case à
     cocher « remettre en stock » dans l'action Rembourser, décochée par défaut.
4. « Avoir » : comme la facture (lot 4), un rendu HTML imprimable référencé
   creditNoteNumber + montant remboursé + référence de la facture d'origine. Pas de PDF
   archivé.
5. Emails : accusé de réception (nouveau), remboursement confirmé (recrée ou adapte), rejet.
6. Transitions strictement monotones (jamais de retour arrière), gardes en updateMany sur le
   statut source, comme partout.

## Tests
- Unitaires : éligibilité 14 j (bornes), unicité par commande, séquence creditNoteNumber,
  transitions (REFUNDED impossible depuis RECEIVED sans passage ACKNOWLEDGED/AWAITING_RETURN),
  garde du token sur l'action publique.

## Interdits
- Rien du § 1 : pas de modèle Refund, pas d'avoir A-YYYY-NNNNN, pas de PDF archivé, pas de
  webhook refund.* (le remboursement est déclenché par NOUS via l'API, sa confirmation Stripe
  n'a pas besoin d'être écoutée — stripeRefundId suffit comme trace).

## Pièges
- L'action publique de création est un endpoint RPC : Zod + token HMAC AVANT toute lecture.
- Deux compteurs séquentiels distincts (invoiceNumber sur Order, creditNoteNumber sur
  RetractationRequest) — ne les fusionne pas, ne les fais pas se suivre.
- L'exception légale (bijou personnalisé/sur-mesure) est un motif de REJECTED humain, pas une
  règle automatique.

## Done
1. `pnpm validate` vert.
2. Parcours dev : achat test → suivi → demande de rétractation → email d'accusé reçu →
   admin : colis reçu → rembourser (mode test Stripe) → RetractationRequest REFUNDED +
   creditNoteNumber=1 + Order REFUNDED + email.
3. Ligne « Lot 5 » cochée au § 3. Commit unique
   `migration(lot-5): rétractation en ligne (RetractationRequest)`. Ne pousse pas.
```

## Lot 6 — Dashboard, emails, polish admin (M)

```text
Tu termines la refonte des surfaces admin de Synclune après la migration de schéma. Lis
d'abord docs/MIGRATION-PROMPTS.md §§ 0-3.

## Préconditions (si KO : STOP)
- Branche `migration-lean`, git propre, `pnpm validate` vert, lots 0-5 cochés au § 3.

## À faire
1. modules/dashboard/ : remplace les stubs du lot 2 par des KPI calculés sur le nouveau
   schéma : CA du mois (somme amountTotalCents des Orders PAID/SHIPPED, net des REFUNDED),
   commandes par statut, stock faible (variants stock ≤ 1 actives), rétractations en cours.
   Supprime les KPI orphelins (remboursements Refund, litiges, facturation PDF).
2. modules/emails/ : inventaire final — gardent : order-confirmation, shipping-confirmation,
   les 3 emails de rétractation (lot 5), admin-alert (si encore branché quelque part — sinon
   supprime). Partent : tout ce qui référence auth, refund ancien modèle, payment-failed (plus
   de PaymentIntent maison : l'échec de paiement se passe chez Stripe, pas d'email de notre
   côté), cancel-order-confirmation (garde-le seulement si l'annulation admin du lot 4 l'envoie).
3. Navigation admin : plus AUCUN lien mort (facturation, remboursements, types-de-produits,
   boutique, maintenance, sécurité) ; ajoute retractations ; app/admin/marketing : page
   orpheline — supprime-la si elle ne porte plus rien.
4. `pnpm knip` : zéro export mort (nettoie ou justifie).
5. Balayage des invalidations de cache : chaque cacheTag posé a encore un updateTag/
   revalidateTag et réciproquement (les tags des modules supprimés ne doivent plus être ni
   posés ni invalidés).

## Interdits
- Rien du § 1. CLAUDE.md gelé. e2e/ hors périmètre.

## Done
1. `pnpm validate` vert ; `pnpm knip` propre.
2. Clic-through complet de l'admin en dev : aucune 404, aucun écran cassé.
3. Ligne « Lot 6 » cochée au § 3. Commit unique
   `migration(lot-6): dashboard, emails, polish admin`. Ne pousse pas.
```

## Lot 7 — E2E refonte (L)

```text
Tu remets la suite Playwright de Synclune au vert après la migration (lots 0-6). Lis d'abord
docs/MIGRATION-PROMPTS.md §§ 0-3. Les e2e sont rouges assumés depuis le lot 2 — c'est ICI
qu'ils redeviennent le filet.

## Préconditions (si KO : STOP)
- Branche `migration-lean`, git propre, `pnpm validate` vert, lots 0-6 cochés au § 3.

## À faire
1. PURGE des specs qui testent des surfaces mortes : auth.spec.ts (Better Auth),
   async-payment-flow, payment-failure-flow, checkout-flow/checkout/checkout-accessibility
   (Elements — à réécrire, pas à rafistoler), guest-cart-merge (plus de fusion), cron/,
   admin-security si trop lié aux sessions Better Auth (sinon adapte), et toute page morte
   dans e2e/pages.
2. auth.setup.ts : réécris sur l'auth maison — POST du mot de passe ADMIN_PASSWORD (env de
   test) sur la page /admin/connexion, storageState avec le cookie admin_session.
3. Checkout : nouveau spec qui teste JUSQU'AU redirect vers checkout.stripe.com (URL de la
   session) — on ne pilote JAMAIS la page hébergée Stripe dans Playwright. La suite du flux
   (webhook → PAID) se teste en invoquant le handler : POST direct sur /api/webhooks/stripe
   avec un payload signé (stripe-node a un utilitaire generateTestHeaderString) ou via les
   fixtures du contract test. Vérifie ensuite la page de confirmation et l'admin.
4. Rétractation : spec du parcours public (suivi → formulaire → confirmation) + workflow admin.
5. Adapte le reste (navigation, product-browsing, cart, wishlist, admin-workflows, seo…) aux
   renommages (variantes, champs name/priceCents) et aux routes disparues
   (produits/[productTypeSlug], /aide…). smoke.spec.ts doit refléter le nouveau parcours
   minimal : accueil → fiche → panier → redirect Stripe.
6. playwright.config / global-teardown / factories : purge des dépendances aux tables mortes.

## Interdits
- Ne réactive aucune surface morte pour faire passer un spec : le spec s'adapte au produit,
  jamais l'inverse.

## Done
1. `pnpm validate` vert et `pnpm e2e` vert en local (note la durée).
2. Ligne « Lot 7 » cochée au § 3. Commit unique `migration(lot-7): refonte e2e`. Ne pousse pas.
```

## Lot 8 — Seed conforme à la DA (S/M)

```text
Tu réécris le jeu de démonstration de Synclune. Lis d'abord docs/MIGRATION-PROMPTS.md §§ 0-4
et docs/BRAND-DA.md (lexique de marque). Exécutable dès la fin du lot 2 (indépendant des lots
3-7).

## Préconditions (si KO : STOP)
- Branche `migration-lean`, git propre, `pnpm validate` vert, lot 2 coché au § 3.

## Contexte
L'ancien seed était le CONTRE-brief exact : plaqué or, Swarovski, visuels de banque d'images
« luxe ». La marque, c'est : bijoux miniatures colorés et expressifs, faits main à Nantes,
six territoires (jardin fantastique, ciel cosmique, arc-en-ciel liquide, pluie et larmes
joyeuses, peinture miniature, enfance) — cf. BRAND-DA.md.

## À faire
1. prisma/seed.ts complet sur le nouveau schéma :
   - 3-4 collections nommées dans les territoires (ex : « Jardin fantastique », « Ciel
     cosmique », « Arc-en-ciel liquide »).
   - Couleurs avec hex fidèles à la palette (rose, lavande, menthe, soleil, turquoise…),
     matériaux vrais du § Produits & matières (acier inoxydable, perles de verre, résine,
     acrylique, chaîne argentée/dorée — PAS d'or fin ni d'argent 925 par défaut).
   - 10-15 produits aux noms dans l'esprit des existants (Green Grape Necklace, Starry Night
     Ring, Rainbow Drop Necklace…), descriptions narratives, prix réalistes (8-45 €), chaque
     produit avec ≥ 1 variante (beaucoup en stock=1 : pièces uniques), quelques produits
     multi-variantes (tailles de bague, longueurs de chaîne).
   - Médias : URLs placeholder stables et licites (pas de banque d'images « joaillerie ») ;
     alt descriptifs SEO (« collier perles de verre turquoise fait main »).
2. Idempotence : le seed s'exécute après reset (db:reset) — pas besoin d'upserts sophistiqués,
   mais il ne doit pas planter s'il est relancé (deleteMany d'abord, ou createMany après reset
   uniquement — au plus simple).

## Done
1. `pnpm db:reset` vert (reset + seed) ; boutique peuplée et cohérente en dev.
2. `pnpm validate` vert.
3. Ligne « Lot 8 » cochée au § 3. Commit unique `migration(lot-8): seed conforme à la DA`.
   Ne pousse pas.
```

## Lot 9 — Documentation finale : CLAUDE.md + sweep (M)

```text
Tu clos la migration de Synclune : la documentation décrit le NOUVEAU monde et plus rien ne
référence l'ancien. Lis d'abord docs/MIGRATION-PROMPTS.md en entier (c'est la source du
nouveau CLAUDE.md).

## Préconditions (si KO : STOP)
- Branche `migration-lean`, git propre, `pnpm validate` vert ET `pnpm e2e` vert,
  lots 0-8 cochés au § 3.

## À faire
1. Réécris CLAUDE.md : garde le profil d'entreprise, la DA et les conventions UI/React qui
   restent vraies ; retire tout ce qui décrit l'ancien monde (Better Auth, PaymentIntent/
   Elements, facturation F-YYYY/PDF/avoirs, OrderHistory, WebhookEvent, StoreSettings,
   ProductType, crons, rate limiting, soft delete, les selects et invariants morts) ; décris le
   nouveau : schéma 9 modèles, auth ADMIN_PASSWORD + cookie HMAC, checkout hébergé + cycle
   PENDING/PAID/CANCELLED, idempotence par garde de transition, invoiceNumber/creditNoteNumber
   Int, rétractation, bouton admin de vérification des PENDING. Vise un fichier NETTEMENT plus
   court que les 99 Ko actuels — le projet est devenu simple, sa doc aussi. Retire la note
   « migration en cours » posée au lot 0.
2. docs/ : archive ou supprime SIMPLIFICATION-V2.md, LOT-C-PLAN.md,
   CHECKOUT-FLOW-MAP-2026-08-10.md ; mets à jour docs/stripe/INDEX.md (il affirme « zéro
   Checkout Session » — c'est devenu faux) et scripts/fetch-stripe-docs.ts (bundles : ajoute
   checkout, retire payment-intents/elements si présents) ; ce fichier MIGRATION-PROMPTS.md
   lui-même : marque la migration TERMINÉE en tête, il pourra être supprimé dans un commit
   ultérieur.
3. Sweep final — ces greps ne doivent plus rien renvoyer de vivant (hors docs archivées et ce
   fichier) : "productSku", "ProductSku", "SkuMedia", "better-auth", "WebhookEvent",
   "StoreSettings", "ProductType", "OrderHistory", "PaymentIntent" (côté client/actions —
   stripePaymentIntentId en colonne est légitime), "invoicePdf", "creditNotePdf",
   "F-YYYY", "rate-limit".
4. package.json / vercel.json / .env.example / knip.config / eslint.config : dernier passage —
   plus aucun script, cron, règle ou chemin mort. Vérifie que la règle ESLint locale
   no-update-tag-outside-server-action est toujours branchée (elle reste vraie).
5. Décide (et note au § 3) : recréer ou non un test claude-md-accuracy sur le nouveau
   CLAUDE.md — si oui, il décrit le nouveau monde.

## Done
1. `pnpm validate` vert, `pnpm e2e` vert, `pnpm build` vert.
2. Sweep de l'étape 3 propre.
3. Ligne « Lot 9 » cochée au § 3 — migration terminée. Commit unique
   `migration(lot-9): documentation finale et sweep`. Ne pousse pas ; propose à Adrien la
   revue de la branche migration-lean complète.
```
