# SIMPLIFICATION-V2.md — Audit de la proposition de schéma « lean »

> Doc créé le **2026-08-09**, en réponse à une proposition externe de `schema.prisma` réduit
> (13 modèles, 5 enums) accompagnée d'un fichier de gardes SQL (15 CHECK).
> Successeur de `SIMPLIFICATION.md` (v1 datée du 2026-08-03, supprimée au commit `1f73d96aa` du
> 2026-08-07 après exécution des lots 0/1/2/4). **Rien ici n'est exécuté sans arbitrage** :
> chaque lot se termine par une case `Décision`.
>
> ⚠️ **Objet audité non archivé.** La proposition n'existe dans aucun fichier du dépôt — son
> modèle-clé `CheckoutReservation` n'apparaît que dans ce document. Ce qui DÉCRIT la proposition
> (13 modèles, 15 CHECK, 17 colonnes d'`Order`…) est donc invérifiable en l'état ; seul ce qui
> décrit le dépôt l'est. À archiver sous `docs/proposals/` si sa source la refournit — sans quoi
> cet audit n'est pas reproductible.
>
> Chiffres mesurés sur le dépôt au 2026-08-09, pas repris d'une exploration antérieure — et
> comptés sur les fichiers **suivis par git**, cf. l'encadré méthode du § 2.

---

## 1. Verdict en trois lignes

La proposition contient **deux chantiers de nature différente empaquetés dans un seul fichier**, et
les mélanger est le principal risque.

1. **La moitié catalogue + checkout est bonne** et c'est là que se trouve le gain réel
   (~−25 000 LOC de modules entiers — `colors`, `product-types`, `materials`, `taxonomies` — plus
   les chunks d'`orders`/`payments`/`webhooks` ; 8 modèles, 9 enums. Le « ~−60 000 » de la
   première rédaction datait d'avant la requalification du Lot C en variante Elements, qui
   **conserve** les composants de paiement). Elle se livre par lots, sans arbitrage externe.
2. **La moitié facturation n'est pas une simplification, c'est un transfert de responsabilité
   réglementaire** vers un produit Stripe qui n'a aujourd'hui **aucun appelant** dans le dépôt.
   Ce n'est pas « −5 000 lignes », c'est « −5 000 lignes **et** +1 intégration neuve **et** un feu
   vert comptable ».
3. **Trois régressions franches** sont à corriger avant toute exécution, quel que soit le lot
   retenu : les gardes d'email `User` (bug de sécurité déjà corrigé une fois), `Color.hex`
   (dépendance dure de la DA), et l'idempotence webhook hors fulfillment.

> **Révision du 2026-08-09 (audit de cet audit).** Trois corrections changent un arbitrage, et
> elles sont intégrées ci-dessous plutôt que listées à part :
>
> - **A7 est faux** et sort du Lot A : `closedAt`/`closedBy` sont **lus et rendus** dans l'admin.
> - **Le Lot C repose sur une fausse dichotomie** : « Checkout Session » n'implique **pas** une page
>   hébergée par Stripe. L'API Checkout Sessions se pilote aussi **avec Elements, sur notre
>   domaine** — les 12 composants, les e2e et l'exception au tutoiement **survivent**. Le lot passe
>   de L à M et perd l'essentiel de son coût annoncé.
> - **Le Lot D ignore la contrainte qui le gouverne** : la réforme française de facturation
>   électronique (e-reporting B2C au **1ᵉʳ septembre 2027** pour les micro-entreprises, via une
>   **Plateforme Agréée**), et le fait que **Stripe déclare lui-même ne pas être cette solution**.

---

## 2. État des lieux chiffré (2026-08-09)

| Surface                           | Actuel                                                                               | Proposition             |
| --------------------------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| `prisma/schema.prisma`            | **803 lignes — 20 modèles, 14 enums**                                                | ~300 l. — 13 mod., 5 e. |
| Modèle `Order`                    | ~40 colonnes (facture, avoir, paiement, remb.)                                       | 17 colonnes             |
| `prisma/sql/raw-guards.sql`       | **22 CHECK · 8 index partiels/expression · 2 extensions · 2 fonctions · 2 triggers** | 15 CHECK, rien d'autre  |
| Migrations                        | **36** (chacune avec son `down.sql`)                                                 | +1 (à écrire)           |
| Code `app` + `modules` + `shared` | 432 247 LOC                                                                          | —                       |
| Fichiers `"use server"`           | **97** (hors tests ; 92 avec la directive en ligne 1)                                | —                       |
| Pages                             | 68, dont **43 admin**                                                                | —                       |
| Tests                             | **1 166** fichiers, dont **279 régression**                                          | —                       |
| Specs e2e                         | 67                                                                                   | —                       |

⚠️ **Méthode de comptage**, parce que des chiffres de ce tableau ont été faux à CHAQUE rédaction —
jamais les mêmes, jamais pour la même cause :
`ls prisma/migrations | wc -l` rend **37** en comptant `migration_lock.toml` — le nombre de
migrations est **36**, ce que dit déjà `CLAUDE.md` § Migrations. `"use server"` varie de 92 à 103
selon qu'on exige la directive en tête de fichier, qu'on exclut les tests, ou qu'on compte toute
occurrence de la chaîne : la ligne ci-dessus retient « fichiers hors tests contenant la directive ».
Et surtout : **`find .` ratisse `.claude/worktrees/`**, qui contient une copie complète et non
suivie du dépôt (gitignorée) — c'est ce qui avait gonflé d'environ ×2 le nombre de fichiers de
test et les « suites par surface » ci-dessous (l'ancien « 2 869 fichiers » ne correspondait à
aucune mesure reproductible). Tout comptage de fichiers passe par `git ls-files`, jamais par un
`find` nu.

**LOC par module concerné** (`modules/`, tests compris) :

| Module                      | LOC         | Sort dans la proposition                       |
| --------------------------- | ----------- | ---------------------------------------------- |
| `orders`                    | 43 767      | amputé (facture, avoir, historique, statuts)   |
| `payments`                  | 18 219      | réécrit (Elements → Checkout Session)          |
| `webhooks`                  | 14 421      | amputé (`WebhookEvent` supprimé)               |
| `colors`                    | 9 777       | supprimé                                       |
| `product-types`             | 7 026       | supprimé                                       |
| `refunds`                   | 6 482       | supprimé                                       |
| `materials`                 | 6 214       | supprimé                                       |
| `invoices`                  | 5 413       | supprimé                                       |
| `taxonomies`                | 2 155       | supprimé (plus de consommateur)                |
| **Sous-total supprimé net** | **~37 000** | + les chunks de `orders`/`payments`/`webhooks` |

**Fichiers touchés par mot-clé** (`*.ts`/`*.tsx`/`*.sql`, hors `node_modules` et `app/generated`) :
`Refund` 253 · `deletedAt` 247 · `Material` 219 · `paymentStatus` 207 · `ProductType` 158 ·
`invoiceNumber` 150 · `isDefault` 126 · `creditNoteNumber` 105 · `OrderHistory` 99 ·
`paidAt` 96 · `stripePaymentIntentId` 89 · `isPrimary` 88 · `WebhookEvent` 32 · `isFeatured` 21.
(`Color` sort à 334, mais le mot est trop générique pour être une mesure.)

**Suites de tests par surface** (fichiers de test suivis par git dont le nom contient le mot) :
`order` 91 · `refund` 33 · `color` 31 · `checkout` 40 · `product-type` 20 · `material` 17 ·
`invoice` 30 · `payment` 20 · `credit-note` 13 · `webhook` 6. ⚠️ En très grande majorité du
Vitest unitaire — les specs Playwright se comptent à part (cf. Lot C : 3 specs « checkout »).

---

## 3. Grille de lecture

| Catégorie | Signification                                                        | Lots         |
| --------- | -------------------------------------------------------------------- | ------------ |
| **A**     | À prendre tel quel — gain net, risque quasi nul                      | Lot A        |
| **B**     | À prendre sous condition — le principe tient, le détail doit changer | Lots B, C, E |
| **C**     | À découpler — dépend d'un arbitrage hors code                        | Lot D        |
| **D**     | À ne pas prendre en l'état — régression identifiée                   | § 5          |

Format de chaque item : **Quoi · Pourquoi · Gain · Risque · Effort** (S < 1 j, M = 1-3 j, L > 3 j)
**· Reco · `Décision : ⬜ à arbitrer`**.

---

## 4. Les lots

### Lot A — À prendre tel quel

Gain net, aucune dépendance externe, une seule migration.

| #      | Quoi                                                            | Pourquoi                                                                                                                                                                                                                        | Effort |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1     | `SkuMedia.isPrimary` → ordre par `(position, id)`               | Supprime l'index unique partiel `SkuMedia_one_primary_per_sku` et toute la machinerie de promotion d'un média principal. L'ordre canonique du dépôt trie **déjà** sur `position` en second critère                              | S      |
| A2     | `ProductSku.isDefault` → premier SKU actif par `(position, id)` | Idem : supprime `ProductSku_productId_isDefault_unique` et la promotion transactionnelle du défaut                                                                                                                              | S      |
| A3     | `ProductCollection.isFeatured` → position                       | Supprime `ProductCollection_collectionId_isFeatured_unique`. ⚠️ **Deux lectures vitrine sont encore vivantes** — cf. l'encadré ci-dessous — et la refonte demandée par Léane le 2026-08-08 le rouvrira : trancher **avec** elle | S      |
| A4     | `ProductStatus` + `CollectionStatus` → `PublicationStatus`      | Deux enums aux membres identiques (`DRAFT`/`PUBLIC`/`ARCHIVED`)                                                                                                                                                                 | S      |
| A5     | `OrderItem.id` → PK composite `[orderId, skuId]`                | Même motif que `ProductSkuColor`/`ProductCollection` (audit V4) : la clé surrogate n'identifie rien de plus. Un panier consolide déjà une quantité par SKU                                                                      | S      |
| A6     | `Order.actualDelivery` → `deliveredAt`                          | Nommage cohérent avec `shippedAt`                                                                                                                                                                                               | S      |
| ~~A7~~ | ~~`StoreSettings.closedAt` / `closedBy`~~                       | **RETIRÉ — la prémisse est fausse, cf. ci-dessous**                                                                                                                                                                             | —      |

⛔ **A7 est faux et ne doit pas être exécuté.** La proposition les dit « écrits, jamais lus » ; ils
sont **lus et rendus** dans une surface admin vivante — `store-settings-form.tsx` affiche
« Fermée par **{closedBy}** le **{closedAt}** » quand la boutique est fermée. Ils sont sélectionnés
par `get-store-settings.ts`, exposés par `store-settings.types.ts`, écrits par `close-store.ts` et
remis à `null` par `reopen-store.ts`. Le raisonnement « boutique mono-opératrice ⇒ qui a fermé est
toujours la même personne » vaut pour `closedBy` seul, **pas pour `closedAt`** : la date de
fermeture est précisément ce que Léane relit pour savoir depuis quand la boutique est coupée.
Si on veut malgré tout réduire, la seule cible défendable est `closedBy` — et il faut alors
**retirer le rendu dans la même PR**, pas seulement la colonne.

⚠️ **A3 avait une prémisse fausse à la première rédaction** (« aucune surface ne le lit depuis le
2026-08-08 ») : le retrait des cartes collection a vidé la **landing** et le méga-menu, pas la page
collection. `isFeatured` garde deux lectures vitrine — le choix de l'image OpenGraph dans
`app/(shop)/collections/[slug]/_utils/generate-metadata.ts`, et le tri
`orderBy: [{ isFeatured: "desc" }, …]` de `GET_COLLECTION_STOREFRONT_SELECT`
(`modules/collections/constants/collection.constants.ts`) qui met la vedette en tête de liste —
plus les surfaces admin (table des collections, alerte « mettre en vedette »). Supprimer la colonne
aujourd'hui casserait l'OG et l'ordre de la page collection : si A3 est retenu, ces lectures se
retirent **dans la même PR**, quel que soit l'arbitrage de Léane sur la refonte.

⚠️ **A6 touche un champ à conséquence légale.** `actualDelivery` n'est pas décoratif : c'est
l'ancre du délai de rétractation (`return-eligibility.service.ts` — `NOT_DELIVERED` si le champ est
nul, et `deadline = actualDelivery + WITHDRAWAL_PERIOD_MS`). Le renommage reste trivial, mais il
traverse **dix** fichiers non-test : les 3 selects d'`order.constants.ts`, le service de
rétractation ci-dessus, `get-action-items.ts`, `prisma/seed.ts`, les actions
`update-order-status.ts` et `update-tracking.ts`, et quatre composants de rendu
(`order-shipping-card.tsx`, `order-tracking.tsx`, `order-status-timeline.tsx`,
`order-return-guidance.tsx`). Le faire d'un `sed` sans relire ces sites est le seul moyen de le
rater — la première rédaction n'en comptait que cinq, ce qui illustre le piège.

⚠️ **A5 exige une pré-vérification de données, sinon la migration échoue en production.**
`OrderItem` ne porte aujourd'hui **aucune** contrainte d'unicité sur `(orderId, skuId)` — seulement
deux `@@index` séparés. La consolidation par SKU est faite **côté panier** (`add-to-cart.ts` cherche
la ligne existante), jamais imposée par la base : rien ne prouve qu'aucune commande historique ne
porte deux lignes du même SKU. La PK composite doit donc être précédée d'un `SELECT orderId, skuId,
count(*) … HAVING count(*) > 1` — c'est exactement le mode d'échec que la proposition a su voir
pour M7 (`StoreSettings.id`) et qu'elle a manqué ici.

⚠️ **A1 a un consommateur nommé** : `pickPrimaryImage()`
(`modules/products/services/product-display.service.ts`) reste la SSOT — elle change de **règle**,
pas de statut. Et `validateProductForPublication`
(`modules/products/services/product-validation.service.ts`) exige « ≥ 1 média de type IMAGE » : ce
prédicat doit devenir « le premier média par position, filtré `mediaType: IMAGE`, existe », sinon
une vidéo en `position: 0` empêche la publication d'un produit qui a pourtant des photos.

⚠️ **A5 déplace une clé de React** : les `key={item.id}` des récapitulatifs deviennent
`key={item.skuId}`.

**Reco : exécuter en bloc A1→A6, sans A7**, après la requête de contrôle d'A5.
`Décision : ✅ arbitré le 2026-08-09 (Adrien) — retenu, A3 INCLUS (lectures vitrine et surfaces admin basculées sur le rang 0 dans la même PR) ; en cours d'exécution`

---

### Lot B — Dénormaliser les taxonomies

#### B1 — `ProductType` → `Product.type String?`

- **Pourquoi** : une dizaine de lignes, un CRUD admin complet (page, table, formulaires, actions,
  cache tags) pour une valeur qui ne sert qu'à filtrer et à intituler.
- **Gain** : `modules/product-types` (7 026 LOC) + `app/admin/catalogue/types-de-produits`.
- **Risque** : moyen. Sans référentiel, rien n'empêche « collier » et « Collier » de coexister.
  **Condition** : une SSOT applicative (`const PRODUCT_TYPES` + `z.enum`), pas un `VarChar` libre.
  La redirection `/produits?type=…` et `test/contract/catalog-type-redirect.regression.test.ts`
  doivent suivre dans la même PR.
- **Effort** : M. **Reco : prendre, avec la SSOT applicative.**
  `Décision : ⛔ RÉVISÉE le 2026-08-10 (Adrien) — REJETÉ, la gestion admin des types est conservée.`
  Le lot avait été intégralement exécuté le 2026-08-10 (SSOT applicative, migration avec backfill,
  ~140 fichiers) puis **défait avant commit** sur cette décision : garder la possibilité pour Léane
  de créer un type sans déploiement l'emporte sur les ~7 000 LOC. Si le lot revient un jour, son
  exécution est reproductible depuis ce document (§ B1 + « Fichiers touchés par mot-clé » du § 2).

#### B2 — `Material` → `ProductSku.materials String[]`

- **Pourquoi** : même constat. `getMaterialOptions()` (qui alimente les filtres publics de
  `/produits` **et** l'admin) devient un `SELECT DISTINCT unnest("materials")`.
- **Perte assumée** : `isActive`, `description`, l'ordre éditorial des matières.
- **Gain** : `modules/materials` (6 214 LOC) + sa page admin.
- **Effort** : M. **Reco : prendre.**
  `Décision : ⛔ RÉVISÉE le 2026-08-10 (Adrien) — REJETÉ, la gestion admin des matériaux est conservée` (même motif que B1).

#### B3 — `Color` → `ProductSku.colors String[]` — ⚠️ **NON EN L'ÉTAT**

- **Le problème** : `Color.hex` a **trois rendus vitrine vivants**, tous perdus par un tableau de
  noms — `product-card-color-swatches.tsx` (les pastilles sur la carte produit),
  `filter-section-colors.tsx` (les chips de filtre), `product-accent-scope.tsx` (l'accent
  chromatique de la fiche produit).
- **Pourquoi ça compte plus qu'ailleurs** : la polychromie **est** le noyau de la DA
  (`CLAUDE.md` § Direction artistique : « une surface qui raconte Synclune en gris avec un filet de
  rose a manqué le brief »). C'est le seul endroit du schéma où la direction artistique a une
  dépendance **dure**. Un `String[]` de noms rendrait des pastilles… sans couleur.
- **Contre-proposition, deux options** :
  1. Garder `Color` **réduite à trois colonnes** `(slug, name, hex)` — plus d'`isActive`, plus de
     `description`, plus de table de jointure : `ProductSku.colorSlugs String[]`. On garde le hex et
     on perd quand même les 9 777 LOC du module `colors`.
  2. `ProductSku.colors Json` au format `[{ name, hex }]`, avec un schéma Zod partagé. Plus lean,
     mais la palette n'est plus réutilisable d'un bijou à l'autre et un renommage devient un
     `UPDATE` de masse.
- **Effort** : M (option 1) / M (option 2). **Reco : option 1.**
  `Décision : ⛔ RÉVISÉE le 2026-08-10 (Adrien) — REJETÉ, la gestion admin des couleurs est conservée` (même motif que B1/B2).

---

### Lot C — Checkout : PaymentIntent + Elements → Checkout Session + `CheckoutReservation`

C'est le changement le plus structurant de la proposition. La première rédaction de cet audit le
jugeait **sous-estimé** ; c'est l'inverse qui est vrai, parce qu'elle raisonnait sur une fausse
dichotomie.

> ⛔ **Correction majeure — « Checkout Session » ≠ « page hébergée par Stripe ».**
> L'API Checkout Sessions se pilote avec plusieurs UI, pas une : page hébergée par Stripe, page
> intégrée, formulaire intégré (⚠️ en **bêta privée** — à ne pas retenir), et **Elements sur notre
> propre page** (`ui_mode: elements`, quickstart officiel). Dans la variante Elements, « les
> clients utilisent une page de paiement personnalisée **sur votre site** » — même domaine, mêmes
> composants, même CSS.
>
> Tout ce que le paragraphe « ce qui disparaît » ci-dessous annonçait comme perdu **ne l'est
> pas** si on retient cette variante : les **12 composants** de `modules/payments/components/`
> restent, `use-checkout-submit.ts` et `mapStripeErrorMessage` restent, **l'exception au
> tutoiement** (`checkout-voice-tutoiement.regression.test.ts`) reste, et les **3 specs e2e**
> « checkout » (24 cas — `checkout.spec.ts`, `checkout-flow.spec.ts`,
> `checkout-accessibility.spec.ts`) restent pilotables par Playwright puisque la page ne quitte
> jamais notre domaine. ⚠️ Les deux premières rédactions écrivaient « 45 specs e2e » : c'était le
> comptage de FICHIERS DE TEST du § 2 (lui-même gonflé par le worktree — 40 réels, en très grande
> majorité du Vitest unitaire qui teste des services survivants) requalifié à tort en specs
> Playwright. Seuls `initialize-payment.ts` / `confirm-checkout.ts` / `update-payment-amount.ts` /
> `cancel-orphan-payment-intent.ts` sont réellement remplacés — c'est-à-dire exactement la
> plomberie que la réservation est censée simplifier.
>
> **Ce qui change vraiment**, et qui reste à trancher : `CHECKOUT-IDOR-001`
> (`metadata.guestSessionId`) ne devient pas sans objet, il **change de porteur** — la garde
> d'ownership se pose sur la Checkout Session au lieu du PaymentIntent, et doit être réécrite,
> pas supprimée. Et le remplaçant d'`update-payment-amount.ts` a une forme imposée : une Checkout
> Session se met à jour en retransmettant les `line_items` **en entier** (conserver un item =
> renvoyer son `id`, l'omettre = le supprimer) ; `expires_at`, `mode` et `currency` ne sont pas
> modifiables.
>
> Accessoirement, **Stripe recommande désormais l'API Checkout Sessions pour la majorité des
> intégrations neuves** — et déconseille explicitement Payment Intents pour une intégration
> neuve, sauf demande expresse : le lot n'est donc pas seulement un gain de simplicité, c'est
> aussi l'alignement sur le chemin supporté.
>
> **Conséquence sur l'arbitrage : effort L → M**, et le principal argument contre le lot tombe.

- **Ce qui est bon** : le modèle `CheckoutReservation` est correct. La réservation atomique du stock
  avant exposition du `client_secret`, et surtout « **la suppression de la ligne EST le verrou
  d'idempotence** », sont un vrai gain de simplicité sur le lock `FOR UPDATE` actuel de
  `order-creation.service.ts`. La séquence recommandée (Session Stripe → réservation DB → seulement
  ensuite le `client_secret`) est la bonne.
- **Ce qui disparaît — en variante « page hébergée » uniquement** (conservé ici pour mémoire, mais
  ce n'est **pas** la variante recommandée, cf. l'encadré ci-dessus) : `initialize-payment.ts`,
  `confirm-checkout.ts`, `update-payment-amount.ts`, `cancel-orphan-payment-intent.ts`, les
  **12 composants** de `modules/payments/components/`, `use-checkout-submit.ts` et
  `mapStripeErrorMessage` — donc aussi l'unique exception au tutoiement
  (`checkout-voice-tutoiement.regression.test.ts`). **En variante Elements, seuls les 4 fichiers
  d'actions sont remplacés.**
- **Ce que ça coûte, et que la proposition ne dit pas** :
  - `docs/stripe/INDEX.md` **exclut délibérément les 40 pages « Checkout Sessions »** avec le motif
    « Synclune n'en crée jamais ». Il faut les tirer, rouvrir les events `checkout.session.*` dans
    le registry, et régénérer les fixtures de `test/contract/stripe-events.test.ts`.
  - **Les frais de port changent de SSOT.** Ils sont aujourd'hui calculés côté app ; une Checkout
    Session les veut en `shipping_options` déclarées chez Stripe. Soit on duplique, soit on
    synchronise — à trancher explicitement, c'est exactement le genre de double source qui a produit
    les dettes précédentes.
  - Les **3 specs e2e** « checkout » (24 cas) ne survivent **qu'en variante Elements**. En page
    hébergée, Playwright ne pilote pas le formulaire Stripe de la même manière et il faut les
    réécrire — avec les 12 composants et l'exception au tutoiement, c'est l'essentiel du surcoût
    de la page hébergée, et c'est précisément ce que la variante Elements évite. ⚠️ Le coût évité
    avait été surestimé d'un facteur ~15 par le faux « 45 specs » : ce qui rend le lot finançable,
    c'est la **survie des composants et de leurs tests unitaires**, pas un volume de specs.
- ⚠️ **Trou fonctionnel P0 dans la proposition** : rien ne libère une réservation dont
  `checkout.session.expired` n'arrive pas. Le webhook peut échouer, et Stripe cesse de retenter à
  J+3 — le stock resterait immobilisé **définitivement**. Il faut, au choix : (a) filtrer
  `expiresAt > now()` sur le chemin de lecture du stock disponible, ou (b) une passe de balayage.
  Le plan Hobby plafonne à **un run quotidien par cron** (`cron-hobby-plan-daily-limit.regression.test.ts`) :
  l'option (a) est la seule qui tienne sans dépendre d'un cron.
  ⚠️ **Et elle impose de fixer `expires_at` explicitement — à la création, définitivement.** La
  doc Stripe est nette : `expires_at` accepte **30 minutes à 24 heures**, **vaut 24 heures par
  défaut**, et **n'est pas modifiable** après création (absent de l'endpoint de mise à jour ; seul
  `POST /v1/checkout/sessions/{id}/expire` permet d'expirer manuellement). Une option (a) laissée
  au défaut rendrait donc un bijou invisible pendant **24 h** après un panier abandonné — sur un
  catalogue de pièces uniques, c'est la boutique qui se vide toute seule. La réservation doit être
  créée près du plancher (≈ 30 min), et ce nombre est un paramètre de la SSOT, pas une constante
  enfouie. Noter que Stripe, de son côté, ne documente que « écoutez `checkout.session.expired` » :
  le filet (a) est un ajout de cet audit, pas une reprise de la doc.
- **Effort** : **M** en variante Elements (L en page hébergée).
  **Reco : prendre, en variante Elements, dans une PR isolée, après A et B.** `Décision : ✅ arbitré le 2026-08-09 (Adrien) — variante Elements retenue, dernier lot de l'ordre § 6`

---

### Lot D — Facturation vers Stripe — **à découpler, arbitrage hors code**

La proposition écrit : « Stripe reste la source de vérité pour paiement, facture, reçu,
remboursement, avoir ». **Quatre** faits à poser avant d'en discuter — et le premier, absent de la
première rédaction de cet audit, suffit à recadrer tout le lot.

**Fait 0 — la réforme française de facturation électronique gouverne ce lot, et Stripe déclare
lui-même ne pas être la solution.** C'est la contrainte décisive, et elle a un calendrier :

| Échéance           | Ce qui devient obligatoire                                                                                                                                   | Pour qui                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| **1ᵉʳ sept. 2026** | Être capable de **recevoir** une facture électronique — donc être **inscrit à l'annuaire** du Portail Public de Facturation (ouvert depuis le 1ᵉʳ juin 2026) | **toutes** les entreprises |
| **1ᵉʳ sept. 2027** | **Émettre** en format structuré (Factur-X / UBL / CII) **et faire l'e-reporting**                                                                            | micro-entreprises et TPE   |

⚠️ **La ligne 2026 concerne Synclune dans trois semaines, indépendamment de tout lot** : elle ne
dépend d'aucun arbitrage de ce document, et les deux premières rédactions ne la portaient pas. Un
**décret et un arrêté du 27 juillet 2026** précisent la réforme — à lire avant de figer le § 7. Le
calendrier est confirmé à ce jour (amendement de report rejeté, échéances réaffirmées par la
DGFiP).

Trois conséquences qui déplacent le débat :

1. **Les ventes B2C de Synclune relèvent de l'e-reporting**, pas de la facturation électronique
   B2B — mais l'e-reporting est **lui aussi** à transmettre via une **Plateforme Agréée** (PA, le
   nouveau nom des ex-PDP). ⚠️ La franchise en base (Art. 293 B) n'en dispense **pas** :
   impots.gouv.fr est explicite (« vous êtes franchisé en base ou micro-entrepreneur, vous êtes
   aussi concerné » ; sans facture émise, « a minima concerné par le e-reporting ») — l'idée d'une
   exemption des micro en franchise est une idée reçue. Deux paramètres dimensionnent le chantier :
   la transmission est **bimestrielle** pour les franchisés en base (le rythme le plus souple de la
   réforme), et seules les opérations exonérées des Art. 261 à 261 E en sont exclues — pas les
   nôtres. `CLAUDE.md` § Facturation le dit déjà à sa manière : l'e-reporting a été **retiré du
   code**, « à réécrire au go-live ». Ce lot ne peut pas être arbitré sans ce chantier en face.
2. **Stripe n'est pas une PA, et le dit.** Sa propre documentation pose que Stripe Billing et Stripe
   Invoicing « ne génèrent ni n'envoient directement de factures électroniques », et renvoie vers
   des applications tierces de son App Marketplace (la page ne cite nommément que **Billit**).
   Migrer la facturation « vers Stripe » ne fait donc **pas** disparaître le problème
   réglementaire : il faudra une PA de toute façon.
3. **La bonne question n'est donc plus « maison ou Stripe »**, mais **« quelle PA, alimentée par
   quoi »** — par nos données de commande, ou par les objets Stripe. Poser le lot D comme une
   suppression de `modules/invoices` fait manquer la seule décision qui compte, et qui a une date.

⚠️ Corollaire de calendrier : l'échéance du **1ᵉʳ septembre 2027** est un plafond dur. Un lot D
démarré tard, c'est une migration de facturation **et** un raccordement PA dans la même fenêtre.
Le calendrier plaide pour choisir la PA **d'abord**, et n'en déduire qu'ensuite s'il reste un
intérêt à déplacer la facturation.

**Fait 1 — ce n'est pas une suppression, c'est une intégration neuve.** Aujourd'hui la facturation
est **100 % maison** : `stripe.invoices` n'a **aucun appelant** dans le dépôt, et
`docs/stripe/INDEX.md` exclut explicitement les 35 pages « Invoicing » avec le motif « les factures
et avoirs sont générés en interne ». Le solde n'est pas −5 400 LOC (`modules/invoices`), c'est
−5 400 LOC **plus** une intégration Stripe Invoicing à écrire, tester en mode test et faire valider.

**Fait 2 — ce que le dépôt garantit aujourd'hui et qu'il faudra re-garantir ailleurs.** Ces
invariants sont documentés article par article dans `CLAUDE.md` § Facturation électronique :

| Ce qui existe                                                    | Article visé         | Où ça atterrit chez Stripe                                          |
| ---------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| Numérotation `F-YYYY-NNNNN` gap-free, advisory lock + CHECK DB   | Art. 286 CGI         | **à vérifier** — voir ci-dessous                                    |
| Émission à l'encaissement, jamais avant                          | Art. 289-I CGI       | natif (invoice liée au paiement)                                    |
| Avoir `A-YYYY-NNNNN` référençant la facture corrigée             | Art. 272-I CGI       | `credit_notes` Stripe, adossées à une Invoice                       |
| Mention « TVA non applicable, art. 293 B du CGI »                | Art. 293 B CGI       | `invoice_creation.invoice_data.footer` — **à configurer**           |
| PDF archivé + SHA-256 re-vérifié à chaque téléchargement, 10 ans | Art. L102 B LPF      | **aucun équivalent** — voir ci-dessous                              |
| `OrderHistory` immuable (transitions, auteur, source)            | Art. L123-22 C. com. | **aucun équivalent** — Stripe trace les paiements, pas l'expédition |
| Export livre de recettes filtré sur `paidAt`                     | Art. 50-0 CGI        | réécrire depuis `createdAt` + `totalCents` (faisable)               |

**Fait 3 — la numérotation : moins bloquante qu'annoncé, mais butée ailleurs.** Les payloads du
mirror local (`docs/stripe/01-payments.md`) montrent un `invoice_prefix` **par client** ; en achat
invité, un client Stripe est créé par commande, donc chaque séquence redémarrerait à 1. C'est exact,
mais ce n'est **pas** l'état par défaut ici : Stripe propose deux schémas — séquentiel **par
client** et séquentiel **au niveau du compte** — et il choisit le défaut d'après le pays du compte,
les pays de l'UE recevant **en général** le séquençage au niveau du compte (formulation Stripe :
ces pays le « nécessitent en général », assortie d'un disclaimer — la conformité fiscale reste la
responsabilité du marchand). Un compte Stripe français est donc vraisemblablement déjà dans le bon
mode. La vérification reste due (capture à l'appui), mais elle n'est plus le point dur.

Les vrais obstacles sont ailleurs, et ils n'étaient pas écrits :

- **Le format ne correspond pas — via la numérotation automatique.** Le séquençage compte produit
  `PREFIX-0001` (préfixe + séquence continue, sans variable d'année ni remise à zéro : le prochain
  numéro ne peut être fixé qu'à une valeur **supérieure**) ; nos CHECK DB imposent
  `^F-[0-9]{4}-[0-9]{5}$` et `^A-[0-9]{4}-[0-9]{5}$`. Soit on plie le préfixe Stripe et on perd le
  millésime, soit on relâche les CHECK — c'est-à-dire qu'on retire la garde qui rend la
  séquentialité vérifiable en base. ⚠️ Il existe une troisième voie que les premières rédactions
  ne mentionnaient pas : le champ API `number` est **writable sur une facture draft** (26
  caractères max, avec l'avertissement « you are responsible for ensuring [unique, sequential
  and/or gapless] »). `F-2026-00001` avec reset annuel est donc techniquement réalisable — mais en
  réassumant nous-mêmes la séquentialité, c'est-à-dire en ré-important côté app la machinerie
  (advisory lock, continuité de séquence) que le lot voulait précisément supprimer. Le fait devait
  être écrit ; il ne change pas l'arbitrage.
- **La séquence Stripe ne se réinitialise pas par année.** Notre `F-YYYY-NNNNN` est annuel, avec un
  advisory lock `1_000_000 + year` et une passe de continuité de séquence dans `reconcile-invoices`.
  Une numérotation continue sur toute la vie du compte est défendable au regard de l'Art. 286, mais
  c'est un changement de convention à faire valider, pas un détail d'implémentation.

**Ce qui reste sans réponse dans la proposition** :

- **L102 B LPF** exige de pouvoir _produire_ la facture pendant 10 ans. Aujourd'hui l'artefact est
  chez UploadThing avec son empreinte, et l'intégrité est re-vérifiée **à chaque téléchargement**
  (EINV-PDF-006). Chez Stripe, la disponibilité dépend du compte : que se passe-t-il à la fermeture
  du compte, ou à un litige de facturation Stripe ? Réponse minimale : un export périodique des PDF
  Stripe — ce qui réintroduit une partie de ce qu'on voulait supprimer.
- **L'identité vendeur** ne survit aujourd'hui **que dans le PDF archivé** (`CLAUDE.md`
  invariant 10). Elle passerait sous le contrôle des réglages du compte Stripe, modifiables
  rétroactivement pour les rendus futurs.
- **`OrderHistory`** disparaît sans remplaçant. Le sujet n'est pas le paiement (Stripe le trace)
  mais la **vie de la commande** : passage en préparation, expédition, retour, correction
  d'adresse. Une boutique à ~20 commandes/mois peut assumer de ne plus l'avoir — c'est une décision,
  pas un détail à emporter dans un lot de schéma.

**Effort** : L (plusieurs semaines, dont l'essentiel n'est pas du code).
**Reco : découpler entièrement.** Ce lot ne doit pas voyager avec A/B/C/E. Préalables : feu vert de
l'expert-comptable **et** une intégration Stripe Invoicing prouvée en mode test.
`Décision : ✅ arbitré le 2026-08-09 (Adrien) — DÉCOUPLÉ, hors périmètre d'exécution ; reste bloqué sur le § 7`

---

### Lot E — `WebhookEvent` et l'idempotence

- **Ce qui est juste** : pour le fulfillment, `Order.stripeCheckoutSessionId @unique` + la
  suppression de la réservation dans la même transaction suffisent. Le registre d'events est
  redondant sur ce chemin.
- **Ce qui manque** : trois consommateurs vivants perdent leur support —
  1. `attempts`, qui alimente le seuil d'alerte admin `MAX_WEBHOOK_RETRY_ATTEMPTS` (la route rend un
     500, Stripe redélivre 3 jours et ré-incrémente) ;
  2. la surface d'incident : `WebhookEvent` n'a **aucune page admin**, sa seule lecture est un
     `psql` — c'est précisément ce qui l'avait fait **conserver** à l'audit V4 ;
  3. la dédup des events **hors fulfillment** (remboursement, litige), qui n'ont pas de clé métier
     unique côté `Order`.
- **Reco** : garder `WebhookEvent`, **réduite** à `(stripeEventId @unique, eventType, status,
attempts, receivedAt, processingStartedAt)` — ce qu'elle est déjà à deux colonnes près (`id` et
  `processedAt`). Le vrai gain est nul, le risque de la retirer ne l'est pas. Re-trancher **après**
  le lot D, dont il dépend (plus de remboursements en base ⇒ moins d'events à dédupliquer).
- ⚠️ **La seule colonne réellement retirée par cette réduction, `processedAt`, a été explicitement
  CONSERVÉE à l'audit V4** — le commentaire du schéma couvre `eventType` **et** `processedAt`
  ensemble (« sont écrits-seulement ») et donne le motif : la table n'a **aucune page admin**,
  donc leur seule surface de lecture est le SQL d'incident (« quel type d'event, traité quand »).
  C'est le même argument que celui invoqué deux lignes plus haut pour garder la table entière.
  Retirer `processedAt` revient donc à **infirmer une décision documentée** — faisable, mais à
  assumer comme tel, pas à emporter en passant.
- **Effort** : S. `Décision : ✅ arbitré le 2026-08-09 (Adrien) — réduction retenue (jamais la suppression) ; EXÉCUTÉ le 2026-08-10` (migration
  `20260810120000_v5_lot_e_webhook_event_natural_pk` : `stripeEventId` devient la PK naturelle,
  `id` et `processedAt` partent — l'infirmation de la décision V4 sur `processedAt` est assumée
  et documentée dans le commentaire du schéma ; « traité quand » reste lisible via
  `processingStartedAt`)

---

## 5. Angles morts — ce que la proposition perd en silence

Ces points ne sont pas des arbitrages : ce sont des régressions, à corriger dans la proposition
elle-même.

| #   | Perte                                                                                            | Pourquoi c'est une régression                                                                                                                                                                                                                                 | Gravité |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| M1  | `User_email_lowercase` (CHECK) + `User_email_lower_key` (UNIQUE sur `lower(email)`)              | **Bug de sécurité déjà survenu et corrigé** : `@unique` seul est sensible à la casse, ce qui laissait un compte suspendu se reconnecter avec un email en casse mixte. Verrouillé par `user-email-case-insensitive.regression.test.ts`. **Non négociable**     | **P0**  |
| M2  | Les 4 index GIN trigram + les extensions `pg_trgm`/`unaccent` + la fonction `immutable_unaccent` | La recherche admin floue et insensible aux diacritiques (« creole » → « créole ») perd son support. Assumable en volume, **mais** `customerName` part dans `shippingDetails Json` : la recherche admin par nom doit être **réécrite**, pas seulement dégradée | P1      |
| M3  | Aucun sweeper de `CheckoutReservation` expirée                                                   | Cf. Lot C : un `checkout.session.expired` perdu immobilise du stock définitivement                                                                                                                                                                            | **P0**  |
| M4  | Cascade `Product → ProductSku` bloquée par `OrderItem.skuId onDelete: Restrict`                  | Sans `deletedAt`, supprimer un produit déjà vendu échoue sur une **erreur FK Postgres brute**, remontée à Léane en « Une erreur est survenue ». Il faut une garde applicative explicite et un message (« ce bijou a été vendu, archive-le »)                  | P1      |
| M5  | `OrderItem.order onDelete: Restrict`                                                             | Une `Order` ne peut alors **plus jamais** être supprimée. C'est cohérent avec une purge RGPD par `UPDATE` (`piiPurgedAt` est conservé), mais ce n'est ni dit ni testé — à assumer explicitement, sinon quelqu'un « corrigera » en `Cascade`                   | P2      |
| M6  | `ProductSku_compareAtPrice_valid` passe de `>=` à `>`                                            | Changement de comportement silencieux : un prix barré **égal** au prix, aujourd'hui accepté, deviendrait rejeté en base                                                                                                                                       | P2      |
| M7  | `StoreSettings.id` : `store-settings-singleton` → `store-settings`                               | La ligne existante doit être migrée **avant** que le nouveau CHECK ne s'applique, sinon la migration échoue en production                                                                                                                                     | P1      |
| M8  | `CheckoutReservation.items Json` non typé                                                        | Un `Json` sans schéma partagé ni test de parité est exactement le trou que `zod-prisma-length-parity.contract.test.ts` existe pour fermer ailleurs. Idem pour `Order.shippingDetails`                                                                         | P1      |
| M9  | `Order` sans aucun `@@index`                                                                     | **Sous-évalué à la première rédaction.** `Order` en porte **5** aujourd'hui, pas zéro — cf. l'encadré ci-dessous. Le volume (~2 400 lignes en 10 ans) rend la perte indolore pour la liste admin, **mais pas pour `[piiPurgedAt, paidAt]`**                   | **P2**  |
| M10 | `Order.paidAt`                                                                                   | L'export livre de recettes (Art. 50-0 CGI) filtre dessus (`where.paidAt`). Dans le nouveau modèle une `Order` naît payée, donc `createdAt` en tient lieu — **le remplacement doit être écrit**, pas déduit                                                    | P2      |

⚠️ **Précision sur M9.** L'affirmation « c'est l'arbitrage acté à l'audit V1 » n'est pas soutenue
par le schéma : `Order` porte aujourd'hui **cinq** index —
`[paidAt desc]`, `[status, createdAt desc]`, `[invoiceStatus]`,
`[invoiceRetryDeferred, paidAt]`, `[piiPurgedAt, paidAt]`.
Trois disparaissent légitimement avec le Lot D (ils servent la facturation). Deux méritent un
arbitrage explicite :

- `[status, createdAt desc]` sert exactement la liste admin que M9 déclare pouvoir laisser sans
  index — à ce volume, c'est effectivement indolore ;
- **`[piiPurgedAt, paidAt]` sert la purge RGPD à 10 ans** (`hard-delete-retention`), qui **survit**
  au Lot D. C'est un balayage périodique sur toute la table, pas un tri d'affichage : le retirer
  « en même temps que les autres » est le genre de perte silencieuse que ce § existe pour attraper.

---

## 6. Ordre d'exécution recommandé

Chaque étape est une PR autonome, avec sa migration **et son `down.sql`** (exigé par
`test/contract/schema-migration-parity.contract.test.ts`).

1. **Lot A** — schéma seul, aucune dépendance. **A1→A6, sans A7.** Corrige M6 et M7 au passage,
   et fait passer la requête de contrôle des doublons `(orderId, skuId)` avant A5.
   ✅ **Exécuté le 2026-08-10** (migration `20260809100000_v5_lot_a_rank_positions_and_order_item_pk`).
2. ~~**Lot B1 + B2** — dénormalisation types/matières, avec SSOT applicative.~~ **REJETÉS le
   2026-08-10** (gestion admin conservée) — l'ordre saute directement au 3.
3. ~~**Lot B3** — couleurs, option 1 (table réduite `slug/name/hex`).~~ **REJETÉ le 2026-08-10**
   (gestion admin conservée).
4. **Lot E** — `WebhookEvent` réduite, pas supprimée.
   ✅ **Exécuté le 2026-08-10** (migration `20260810120000_v5_lot_e_webhook_event_natural_pk`).
5. **Lot C** — Checkout Session **en variante Elements** + réservation. PR isolée, corrige M3
   (avec `expires_at` ≈ 30 min, jamais le défaut de 24 h) et M8. **Ni les 12 composants ni les
   3 specs e2e ne sont à réécrire** dans cette variante — c'est ce qui rend le lot finançable.
6. **Lot D** — bloqué sur arbitrage comptable **et sur le choix d'une Plateforme Agréée**. Ne pas
   démarrer avant les réponses du § 7.

M1, M2 et M4 sont transverses : les traiter dans la première PR qui touche la table concernée.
M9 se traite dans la PR du Lot D, qui est celle qui retire les index de facturation.

⚠️ **Ne jamais éditer `prisma/migrations/0_init/migration.sql`** — son checksum est enregistré dans
`_prisma_migrations`. Toute évolution passe par une migration nouvelle, et l'annexe des gardes bruts
de `0_init` reste le reflet de `prisma/sql/raw-guards.sql` (idempotent, `DROP … IF EXISTS` devant
chaque garde).

---

## 7. À trancher hors code

**Six** questions dont les réponses conditionnent le Lot D. Elles ne sont pas techniques.
Les deux premières priment : tant qu'elles ne sont pas tranchées, les suivantes portent sur un
lot dont on ne sait pas s'il a encore un objet. (S'y ajoute une échéance qui n'attend aucun
arbitrage : l'inscription à l'annuaire du Portail Public de Facturation, due au 1ᵉʳ sept. 2026 —
cf. le tableau calendrier du Lot D.)

0a. **Plateforme Agréée — laquelle, et alimentée par quoi ?** L'e-reporting B2C devient obligatoire
au **1ᵉʳ septembre 2027** pour une micro-entreprise, et il transite par une PA. Stripe n'en est pas
une et ne prétend pas l'être. Le choix de la PA est donc à faire **indépendamment** du lot D — et
il peut le rendre sans objet, si la PA retenue se raccorde plus naturellement à nos données de
commande qu'aux objets Stripe.

1. **Expert-comptable** — au vu de 0a, déplacer la facturation vers Stripe apporte-t-il encore
   quelque chose, ou est-ce un détour qui ajoute un intermédiaire sans retirer l'obligation ? Et
   si oui : Stripe Invoicing satisfait-il Art. 286 (numérotation séquentielle gap-free), 289-I
   (émission à l'encaissement), 272-I (avoir) et L102 B LPF (production sur 10 ans), avec quelle
   configuration de compte exactement ?
   ⚠️ En particulier : une séquence **continue sur la vie du compte** (sans remise à zéro annuelle,
   cf. Fait 3) est-elle acceptable, et peut-on abandonner le millésime `F-YYYY-NNNNN` ?
2. **Stripe** — la numérotation séquentielle au niveau du **compte** (et non par client) est-elle
   active ? Le défaut d'un compte UE devrait déjà l'être ; vérification en mode test, capture à
   l'appui.
3. **Léane** — accepte-t-elle de perdre la piste d'audit de la vie d'une commande (`OrderHistory`),
   c'est-à-dire de ne plus savoir _quand_ et _par quel chemin_ une commande est passée en
   préparation, expédiée ou retournée ?
4. **Léane** — les remboursements se pilotent-ils désormais **exclusivement** depuis le dashboard
   Stripe, sans plus aucune surface de consultation dans l'admin ? (Le cap n° 1 du 2026-08-03 allait
   déjà dans ce sens, mais gardait une page de consultation.)
5. **Léane** — la refonte des cartes collection demandée le 2026-08-08 utilisera-t-elle un levier
   éditorial ? Si oui, A3 (`isFeatured`) est prématuré.

---

## 8. Impact documentaire

Adopter les lots A à E rend **faux** des passages qui ont chacun leur garde-fou automatisé — à
mettre à jour dans la même PR, pas après.

| Document                                        | Ce qui devient faux                                                                                        | Garde-fou qui le détectera                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `CLAUDE.md` § Facturation électronique          | 11 invariants + la table « Conformité réglementaire » (7 lignes)                                           | `claude-md-accuracy.contract.test.ts` (chemins cités)          |
| `CLAUDE.md` § Catalogue — invariants            | Les 5 selects produit / 3 collection / 2 type ; `mediaType` et `pickPrimaryImage` ; `isFeatured`           | `catalogue-selects-*.regression.test.ts`                       |
| `CLAUDE.md` § Auth                              | `requireAuth()` filtre `suspendedAt: null` — colonne supprimée                                             | `no-raw-session-role-trust.regression.test.ts`                 |
| `CLAUDE.md` § Caching                           | Les tags `orders`/`refunds`/`invoices` et `getOrderInvalidationTags`                                       | `cache-invalidation-context.contract.test.ts`                  |
| `CLAUDE.md` § Testing — critical path           | 7 modules dont `refunds` et `invoices`, qui n'existeraient plus                                            | script `test:critical` + hook pre-commit                       |
| `CLAUDE.md` compteurs                           | Nombre de modules (21), de CHECK et d'index de l'annexe des gardes bruts                                   | `claude-md-accuracy.contract.test.ts` (assertions de comptage) |
| `docs/stripe/INDEX.md` § « délibérément exclu » | « Checkout Sessions — Synclune n'en crée jamais » et « Invoicing — non utilisé » deviennent tous deux faux | `stripe-docs-mirror.contract.test.ts`                          |
| `prisma/sql/raw-guards.sql` + annexe `0_init`   | 22 CHECK → ~17, 8 index → 2, triggers d'avoir supprimés                                                    | `schema-migration-parity.contract.test.ts`                     |

---

## 9. Ce que la proposition a bien vu

Pour mémoire, et pour ne pas re-débattre de ce qui est acquis :

- **La séquence de checkout** (Session Stripe → réservation DB atomique → `client_secret`) est la
  bonne, et « la suppression de la réservation **est** le verrou » est plus simple et plus sûr que
  le lock actuel.
- **Les booléens de rang** (`isPrimary`, `isDefault`, `isFeatured`) sont effectivement remplaçables
  par un `position`, et chacun coûte un index unique partiel + une promotion transactionnelle.
- **Les taxonomies mono-usage** (`ProductType`, `Material`) ne méritent pas un CRUD admin complet à
  cette échelle — c'était déjà le constat de S3.1 en v1, qui s'était arrêté à la mutualisation.
- **Les commentaires du schéma proposé portent leur « pourquoi »**, ce qui est la convention du
  dépôt et ce qui rend cet audit possible.

---

## 10. Sources externes (vérifiées le 2026-08-09)

Les affirmations de cet audit portant sur Stripe et sur la réglementation française sont vérifiées
contre les sources ci-dessous, et non contre le mirror local `docs/stripe/` — lequel **exclut
délibérément** les deux chapitres en jeu (Checkout Sessions, Invoicing) et ne pouvait donc pas
trancher ces points.

| Sujet                                                                                 | Source                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Les 4 UI de l'API Checkout Sessions, dont **Elements sur notre domaine**              | [docs.stripe.com — Fonctionnement de Checkout](https://docs.stripe.com/payments/checkout/how-checkout-works)                                                                                                                                                                                                     |
| Checkout Sessions recommandé pour les intégrations neuves                             | [docs.stripe.com — Build a payments page](https://docs.stripe.com/payments/checkout)                                                                                                                                                                                                                             |
| `expires_at` : 30 min – 24 h, **défaut 24 h** ; `checkout.session.expired`            | [docs.stripe.com — Gérer un stock limité](https://docs.stripe.com/payments/checkout/managing-limited-inventory)                                                                                                                                                                                                  |
| Numérotation par client **vs** au niveau du compte ; défaut UE                        | [docs.stripe.com — Customize invoices](https://docs.stripe.com/invoicing/customize)                                                                                                                                                                                                                              |
| **Stripe n'est pas une Plateforme Agréée** et le déclare (cite Billit)                | [stripe.com — E-invoicing in France](https://stripe.com/resources/more/e-invoicing-france)                                                                                                                                                                                                                       |
| Calendrier 2026/2027, e-reporting B2C, formats Factur-X/UBL/CII                       | [impots.gouv.fr — Facturation électronique et plateformes agréées](https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees) · [francenum.gouv.fr — guide e-reporting](https://www.francenum.gouv.fr/guides-et-conseils/pilotage-de-lentreprise/dematerialisation-des-documents/facturation-1) |
| Checkout Session + Elements (`ui_mode: elements`), recommandation explicite           | [docs.stripe.com — Quickstart Checkout Sessions](https://docs.stripe.com/payments/quickstart-checkout-sessions)                                                                                                                                                                                                  |
| Update d'une Session : `line_items` retransmis en entier, `expires_at` non modifiable | [docs.stripe.com — Update Checkout Session](https://docs.stripe.com/api/checkout/sessions/update) · [Dynamic updates](https://docs.stripe.com/payments/checkout/dynamic-updates)                                                                                                                                 |
| Champ `number` writable sur facture draft (26 car., gapless à notre charge)           | [docs.stripe.com — Update Invoice](https://docs.stripe.com/api/invoices/update) · [support.stripe.com — Customize your invoice number](https://support.stripe.com/questions/customize-your-invoice-number)                                                                                                       |
| Franchise 293 B : « aussi concerné », a minima e-reporting, bimestriel                | [impots.gouv.fr — Je facture sans TVA, suis-je concerné ?](https://www.impots.gouv.fr/professionnel/questions/je-nemets-pas-de-facture-ou-je-facture-sans-tva-suis-je-concerne-par-la)                                                                                                                           |
| Décret + arrêté du 27 juillet 2026, annuaire PPF ouvert le 1ᵉʳ juin 2026              | [impots.gouv.fr — Je passe à la facturation électronique](https://www.impots.gouv.fr/professionnel/je-passe-la-facturation-electronique) · [compta-online — décret et arrêté](https://www.compta-online.com/facturation-electronique-ao5562)                                                                     |

⚠️ Les sources réglementaires sont des portails d'information, pas un avis. Elles **cadrent** les
questions du § 7 ; elles ne les remplacent pas.

---

**Statut global : `✅ lots A et E EXÉCUTÉS le 2026-08-10 ; lots B1+B2+B3 REJETÉS le 2026-08-10 (gestion admin des taxonomies conservée) ; reste le lot C ; lot D découplé, bloqué sur le § 7`.**
**Révision 2 du 2026-08-09** — A7 retiré (prémisse fausse), Lot C requalifié en variante Elements
(L → M), Lot D recadré sur la réforme e-invoicing et le choix d'une PA, M9 relevé en P2,
compteurs de migrations / tests / `"use server"` corrigés.
**Révision 3 du 2026-08-09** (contre-audit : dépôt re-mesuré + sources officielles re-tirées) —
**quatre erreurs franches corrigées** : le compteur de fichiers de test (2 869 → 1 166) et les
suites par surface, tous deux gonflés par un `find` ratissant `.claude/worktrees/` (cause racine
ajoutée à l'encadré méthode) ; les « 45 specs e2e » du Lot C ramenées aux **3 specs réelles**
(argument « finançable » recalibré sur la survie des composants) ; la prémisse d'A3 (`isFeatured`
garde deux lectures vitrine : OG et tri de la page collection). Ajouts : l'échéance **annuaire PPF
du 1ᵉʳ sept. 2026** + décret/arrêté du 27 juillet 2026, le champ API `number` (Fait 3), la
non-modifiabilité d'`expires_at`, la fréquence bimestrielle de l'e-reporting en franchise,
l'encadré « objet audité non archivé ». Précisions : A6 traverse 10 fichiers (pas 5), le
commentaire V4 couvre `eventType` + `processedAt`, citation Billit (Invopop retirée), §7 ramené à
six questions (0b et 1 fusionnées), gain du §1 recalibré (~−25 000 LOC de modules entiers). Le doc
est désormais sous contrat `claude-md-accuracy.contract.test.ts` (chemins cités + liens).
