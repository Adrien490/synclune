# MIGRATION-PROMPTS.md — Migration vers le schéma « lean » (Stripe Checkout hébergé)

> **Matériau de travail — à supprimer à la fin de la migration.** Rédigé le 2026-08-14 sur la
> base du schéma cible fourni par Adrien. Ce document est la SSOT du chantier : chaque lot
> ci-dessous est un **prompt autonome** à copier-coller dans une **session Claude fraîche**, dans
> l'ordre. Le tableau de suivi (§ 3) est le seul état partagé entre sessions. Remplace les plans
> antérieurs : `SIMPLIFICATION-V2.md`, `LOT-C-PLAN.md` et `CHECKOUT-FLOW-MAP-2026-08-10.md`
> deviennent des archives (le lot C variante Elements est **abandonné**).

---

## 0. Décisions actées (2026-08-14, Adrien) — non rediscutables par une session d'exécution

| #   | Décision                                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Base jetable** : reset complet de la base, nouveau baseline de migrations, **aucune migration de données**. Les 44 migrations actuelles et `prisma/sql/raw-guards.sql` sont supprimées.                                                                                                                                         |
| D2  | **Le schéma cible (§ 4) fait foi, tel quel** : 9 modèles, `invoiceNumber Int? @unique` séquentiel (plus de format `F-YYYY-NNNNN`), pas d'archivage PDF SHA-256, pas d'`OrderHistory`, pas de `WebhookEvent`, pas de `StoreSettings`, pas de `ProductType`. Une seule retouche autorisée : le `output` du generator (voir ⚠️ § 4). |
| D3  | **Better Auth disparaît.** Auth admin = mot de passe unique `ADMIN_PASSWORD` en variable d'environnement + cookie de session signé maison (HMAC, httpOnly). **Zéro table d'auth en base.**                                                                                                                                        |
| D4  | **Stripe Checkout hébergé** : plus de page de paiement maison. Une action `createCheckoutSession` (line items en `price_data` inline, `shipping_address_collection`, devise `eur` codée en dur) + `redirect(session.url)`. Webhooks : `checkout.session.completed` et `checkout.session.expired`.                                 |
| D5  | **Cycle de vie commande** (défini par les commentaires du schéma cible) : `Order` **PENDING** créé à la création de la session Checkout avec **stock décrémenté** (= réservation) → webhook `completed` (payment_status=paid) → **PAID** ; webhook `expired` → **CANCELLED + restock**.                                           |
| D6  | **« Vert aux frontières »** : chaque lot se termine avec `pnpm validate` vert. Le rouge est autorisé **en cours** de lot, jamais entre deux lots. Exception : les e2e Playwright (hors `validate`) sont rouges assumés des lots 2 à 6 — le lot 7 les refonde.                                                                     |

## 1. Pertes volontaires — INTERDIT de restaurer

Toute session d'exécution qui « découvre » qu'un de ces éléments manque doit considérer que
c'est **voulu**. Ne pas le recréer, ne pas le « réparer », ne pas ré-écrire son test.

- **Better Auth** et ses 4 tables (`User`, `Session`, `Account`, `Verification`), la vérification
  d'email, le reset de mot de passe, les rôles en base.
- **`ProductType`** (module `modules/product-types/`, route `/produits/[productTypeSlug]`, admin
  `catalogue/types-de-produits`).
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

| Lot | Nom                                       | Taille | Statut | Commit | Notes                               |
| --- | ----------------------------------------- | ------ | ------ | ------ | ----------------------------------- |
| 0   | Préparation du terrain                    | S      | ⬜     | —      |                                     |
| 1   | Auth maison (purge Better Auth)           | L      | ⬜     | —      |                                     |
| 2   | Bascule schéma + purge + catalogue        | XL     | ⬜     | —      |                                     |
| 3   | Checkout Stripe hébergé + webhooks        | L      | ⬜     | —      |                                     |
| 4   | Commandes : admin, facturation Int, suivi | L      | ⬜     | —      |                                     |
| 5   | Rétractation (`RetractationRequest`)      | M      | ⬜     | —      |                                     |
| 6   | Dashboard, emails, polish admin           | M      | ⬜     | —      |                                     |
| 7   | E2E refonte                               | L      | ⬜     | —      |                                     |
| 8   | Seed conforme à la DA                     | S/M    | ⬜     | —      | peut s'exécuter dès la fin du lot 2 |
| 9   | Documentation finale (CLAUDE.md) + sweep  | M      | ⬜     | —      |                                     |

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
