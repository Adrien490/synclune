# Idees de Nouvelles Fonctionnalites — Synclune

## Contexte

Synclune est un e-commerce bijoux artisanaux tres complet (9+/10 sur la plupart des audits). Le projet a deja : storefront, admin, Stripe, 43 emails, 17 crons, reviews, wishlist, newsletter, customisation, refunds, discounts, PWA, fuzzy search, RGPD. Les idees ci-dessous ciblent des fonctionnalites a **forte valeur ajoutee** qui manquent et qui sont pertinentes pour un e-commerce bijoux artisanal en micro-entreprise FR.

> **Derniere mise a jour** : 2026-03-15 — audit croise avec le codebase reel.

---

## Contraintes techniques

- **React 19 compiler** : pas de `useMemo`/`useCallback`/`React.memo`
- **Indentation** : tabs (pas d'espaces)
- **Bundle size** : surveille via `pnpm size` (size-limit)
- **Module pattern** : `actions/` (mutations) + `data/` (cache) + `services/` (logique pure) + `components/`
- **Caching** : `"use cache"` + `cacheLife()` + `cacheTag()` + `updateTag()`
- **Forms** : TanStack Form + `useAppForm`
- **Emails** : React Email + Resend (dead-letter queue)

---

## Infrastructure existante reutilisable

| Composant                                                             | Path(s)                                             | Reutilisable pour                          |
| --------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| Discount system (PERCENTAGE/FIXED_AMOUNT, dates, per-user limits)     | `prisma/schema.prisma` L897-931                     | Gift Cards, Loyalty redemption, Parrainage |
| Back-in-stock notifs (wishlist → email automatique)                   | `modules/wishlist/services/notify-back-in-stock.ts` | Precommande notify                         |
| Email infra (43 templates, dead-letter queue)                         | `emails/`, `shared/lib/email-config.ts`             | Tout nouveau template                      |
| Cron infra (17 jobs Vercel)                                           | `vercel.json`, `modules/cron/services/`             | Loyalty expiry, flash sale activation      |
| PostHog events (product_viewed, checkout_started, purchase_completed) | `shared/lib/posthog.ts`, `posthog-events.ts`        | Dashboard analytics avance                 |
| Checkout form (TanStack Form, sections modulaires)                    | `modules/payments/components/checkout-form.tsx`     | Emballage cadeau section                   |
| Admin CRUD pattern (catalogue, commandes, marketing)                  | `app/admin/`, 30+ routes                            | Tout nouveau module admin                  |
| PWA Serwist (service worker, offline, cache strategies)               | `app/serwist/`, 22 fichiers                         | Notifications push                         |
| Refund system complet (6 statuts, admin workflows)                    | `modules/refunds/` (65 fichiers)                    | Portail retours client                     |

---

## Tier 1 — Fort impact business (conversion & fidelisation)

### 1. Programme de fidelite / Points

- Gagner des points a chaque achat (1EUR = 1 point)
- Points bonus sur premiere commande, anniversaire, parrainage
- Echange points → reduction sur prochaine commande
- Dashboard client avec solde de points et historique
- Admin : configurer le ratio points/euros, gerer les bonus
- **Pourquoi** : Augmente le taux de reachat (LTV). Tres attendu en bijouterie ou le panier moyen est modere.

**Etat actuel** : ❌ Absent — aucun modele, module ni infra.

**Ce qui manque** :

- Modele Prisma `LoyaltyAccount` (userId, balance, lifetimePoints) + `LoyaltyTransaction` (type EARN/REDEEM/EXPIRE/BONUS, points, orderId, expiresAt)
- Module `modules/loyalty/` complet (actions, data, services, components)
- Integration checkout : appliquer des points comme reduction
- Cron d'expiration des points (ex: 12 mois sans activite)
- Dashboard client (`/compte/fidelite`)
- Admin config + historique (`/admin/marketing/fidelite`)
- 3+ email templates (points gagnes, points expirant, palier atteint)

**Points d'integration** :

- `Discount` system pour la redemption (creer un Discount temporaire a partir des points)
- Webhook `checkout.session.completed` pour crediter les points post-achat
- Cron infra pour l'expiration automatique
- PostHog pour le tracking engagement

**Modeles Prisma** :

```prisma
model LoyaltyAccount {
  id             String               @id @default(cuid())
  userId         String               @unique
  user           User                 @relation(fields: [userId], references: [id])
  balance        Int                  @default(0)
  lifetimePoints Int                  @default(0)
  tier           LoyaltyTier          @default(BRONZE)
  transactions   LoyaltyTransaction[]
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
}

model LoyaltyTransaction {
  id        String                 @id @default(cuid())
  accountId String
  account   LoyaltyAccount         @relation(fields: [accountId], references: [id])
  type      LoyaltyTransactionType
  points    Int
  orderId   String?
  reason    String?
  expiresAt DateTime?
  createdAt DateTime               @default(now())
}

enum LoyaltyTier {
  BRONZE
  SILVER
  GOLD
}

enum LoyaltyTransactionType {
  EARN
  REDEEM
  EXPIRE
  BONUS
  REFERRAL
}
```

**Fichiers cles a creer** :

- `modules/loyalty/` — module complet (~20 fichiers)
- `app/(boutique)/compte/fidelite/page.tsx` — dashboard client
- `app/admin/marketing/fidelite/` — config + historique admin
- `emails/loyalty-*.tsx` — 3 templates
- Migration Prisma

**Dependances externes** : aucune

**Effort** : L (1-2 semaines) — modele riche, intergration checkout, crons, emails, admin

---

### 2. Gift Cards / Cartes cadeaux

- Acheter une carte cadeau (montant libre ou predefini : 25EUR, 50EUR, 100EUR)
- Email avec code unique + design bijou
- Appliquer comme moyen de paiement au checkout
- Solde partiel possible (utiliser 30EUR sur une carte de 50EUR)
- Admin : voir les cartes emises, soldes, expirations
- **Pourquoi** : Genere des ventes sans effort marketing. Tres populaire en bijouterie (cadeaux).

**Etat actuel** : ❌ Absent — aucun modele ni integration Stripe.

**Ce qui manque** :

- Modele Prisma `GiftCard` (code, initialAmount, balance, purchaserId, recipientEmail, expiresAt, status) + `GiftCardTransaction` (historique d'utilisation)
- Page d'achat de carte cadeau (`/boutique/carte-cadeau`)
- Integration checkout : champ "Code carte cadeau" + deduction du solde
- Email template avec design bijou + code unique
- Page de consultation du solde (`/carte-cadeau/solde`)
- Admin : listing, soldes, historique (`/admin/marketing/cartes-cadeaux`)

**Points d'integration** :

- `Discount` system : les gift cards fonctionnent differemment (solde decroissant vs reduction one-shot), mais le champ checkout est similaire
- Checkout form : ajouter un champ code gift card a cote du code promo existant
- Email infra : template avec QR code ou code lisible
- Stripe : possibilite d'utiliser Stripe pour l'achat de la gift card elle-meme

**Modeles Prisma** :

```prisma
model GiftCard {
  id             String               @id @default(cuid())
  code           String               @unique
  initialAmount  Int                  // en centimes
  balance        Int                  // en centimes
  purchaserId    String?
  purchaser      User?                @relation("GiftCardPurchaser", fields: [purchaserId], references: [id])
  recipientEmail String?
  recipientName  String?
  message        String?
  expiresAt      DateTime
  status         GiftCardStatus       @default(ACTIVE)
  transactions   GiftCardTransaction[]
  orderId        String?              // commande d'achat de la gift card
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
}

model GiftCardTransaction {
  id         String   @id @default(cuid())
  giftCardId String
  giftCard   GiftCard @relation(fields: [giftCardId], references: [id])
  amount     Int      // en centimes (negatif = utilisation, positif = credit)
  orderId    String?  // commande ou la gift card a ete utilisee
  createdAt  DateTime @default(now())
}

enum GiftCardStatus {
  ACTIVE
  EXHAUSTED
  EXPIRED
  DISABLED
}
```

**Fichiers cles a creer** :

- `modules/gift-cards/` — module complet (~25 fichiers)
- `app/(boutique)/boutique/carte-cadeau/page.tsx` — page d'achat
- `app/(boutique)/carte-cadeau/solde/page.tsx` — consultation solde
- `app/admin/marketing/cartes-cadeaux/` — admin CRUD
- `emails/gift-card-*.tsx` — 2-3 templates (envoi, utilisation, expiration)
- Modification `checkout-form.tsx` — champ gift card
- Migration Prisma

**Dependances externes** : aucune (generation de code unique interne)

**Effort** : L (1-2 semaines) — modele Prisma + checkout integration + emails + admin + page d'achat. Sous-estime a M dans la version precedente.

---

### 3. Emballage cadeau & Message personnalise

- Option au checkout : emballage cadeau (+XEUR ou gratuit)
- Champ texte pour message personnalise (carte jointe)
- Choix d'emballage (ecrin, pochette, boite)
- Affichage dans le detail commande admin
- **Pourquoi** : Les bijoux sont souvent des cadeaux. Augmente le panier moyen et l'experience client.

**Etat actuel** : ❌ Absent — pas de champs sur `Order` ou `CartItem`.

**Ce qui manque** :

- Champs Prisma sur `Order` : `giftWrap` (Boolean), `giftWrapType` (enum), `giftMessage` (String?)
- Section dans `checkout-form.tsx` (toggle + select type + textarea message)
- Affichage dans le detail commande admin
- Affichage dans l'email de confirmation commande
- Logique de prix (supplement configurable via `StoreSettings` ou constante)

**Points d'integration** :

- Checkout form : inserter une nouvelle section entre les items et le paiement
- Order confirmation email : conditionnel si `giftWrap === true`
- Admin order detail : afficher le message et le type d'emballage
- `StoreSettings` module : ajouter config prix emballage

**Modeles Prisma** :

```prisma
// Ajout sur Order existant
model Order {
  // ... champs existants
  giftWrap     Boolean       @default(false)
  giftWrapType GiftWrapType?
  giftMessage  String?
}

enum GiftWrapType {
  ECRIN
  POCHETTE
  BOITE
}
```

**Fichiers cles a creer/modifier** :

- `modules/payments/components/gift-wrap-section.tsx` — composant checkout
- Modifier `checkout-form.tsx` — integrer la section
- Modifier `prisma/schema.prisma` — champs Order
- Modifier `emails/order-confirmation.tsx` — section conditionnelle
- Modifier composant admin detail commande
- Migration Prisma

**Dependances externes** : aucune

**Effort** : S (1-3 jours)

---

### 4. Systeme de parrainage

- Chaque client a un lien/code de parrainage unique
- Le parrain recoit une reduction quand le filleul commande
- Le filleul recoit une reduction sur sa premiere commande
- Dashboard client : suivi des parrainages
- Admin : configurer les montants, voir les stats
- **Pourquoi** : Acquisition client organique a cout quasi nul.

**Etat actuel** : ❌ Absent — aucun modele ni tracking.

**Ce qui manque** :

- Modele Prisma `Referral` (referrerId, referredId, code, status, discountId)
- Generation de code unique par utilisateur
- Landing page avec code pre-rempli (`/parrainage/[code]`)
- Attribution automatique des reductions (parrain + filleul)
- Dashboard client (`/compte/parrainage`)
- Admin stats (`/admin/marketing/parrainage`)

**Points d'integration** :

- `Discount` system : creer des Discounts automatiques lies au parrainage (per-user, one-shot)
- Inscription : detecter le code parrainage dans l'URL/cookie
- Webhook `checkout.session.completed` : valider le parrainage apres premiere commande du filleul
- Email infra : notification au parrain quand le filleul commande

**Modeles Prisma** :

```prisma
model Referral {
  id          String         @id @default(cuid())
  referrerId  String
  referrer    User           @relation("Referrer", fields: [referrerId], references: [id])
  referredId  String?
  referred    User?          @relation("Referred", fields: [referredId], references: [id])
  code        String         @unique
  status      ReferralStatus @default(PENDING)
  rewardId    String?        // Discount cree pour le parrain
  createdAt   DateTime       @default(now())
  completedAt DateTime?
}

enum ReferralStatus {
  PENDING
  COMPLETED
  EXPIRED
}
```

**Fichiers cles a creer** :

- `modules/referral/` — module complet (~15 fichiers)
- `app/(boutique)/parrainage/[code]/page.tsx` — landing page
- `app/(boutique)/compte/parrainage/page.tsx` — dashboard client
- `app/admin/marketing/parrainage/` — admin stats
- `emails/referral-*.tsx` — 2 templates (invitation, recompense)
- Migration Prisma

**Dependances externes** : aucune

**Effort** : M (3-7 jours)

---

## Tier 2 — Differenciation & engagement

### 5. Lookbook / Galerie d'inspirations

- Page editoriale avec photos stylisees de bijoux portes
- Liens directs vers les produits presents dans chaque photo
- Filtrage par occasion (mariage, quotidien, soiree)
- Admin : uploader des photos, tagger les produits
- **Pourquoi** : Le visuel est crucial en bijouterie. Inspire l'achat et ameliore le SEO (images).

**Etat actuel** : ❌ Absent — la galerie Polaroid existante est decorative, pas shoppable.

**Ce qui manque** :

- Modeles Prisma `Lookbook` et `LookbookItem` (photo + produits tagges + hotspots)
- Page publique `/boutique/lookbook` avec grid filtrable
- Admin CRUD (`/admin/contenu/lookbook`)
- Upload via UploadThing + hotspot editor (click-to-tag produits)
- Schema JSON-LD `ImageGallery`

**Points d'integration** :

- UploadThing pour l'upload des photos editoriales
- Produit linking : relation many-to-many avec `Product`
- Admin CRUD pattern existant (copier le pattern catalogue)
- SEO : sitemap-images.xml existant, etendre pour les lookbooks

**Modeles Prisma** :

```prisma
model Lookbook {
  id          String         @id @default(cuid())
  title       String
  slug        String         @unique
  description String?
  occasion    String?        // mariage, quotidien, soiree
  coverImage  String
  items       LookbookItem[]
  published   Boolean        @default(false)
  publishedAt DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model LookbookItem {
  id         String   @id @default(cuid())
  lookbookId String
  lookbook   Lookbook @relation(fields: [lookbookId], references: [id])
  imageUrl   String
  products   Product[] // many-to-many
  position   Int       @default(0)
  createdAt  DateTime  @default(now())
}
```

**Fichiers cles a creer** :

- `modules/lookbook/` — module complet (~20 fichiers)
- `app/(boutique)/boutique/lookbook/page.tsx` — galerie publique
- `app/admin/contenu/lookbook/` — admin CRUD
- Migration Prisma

**Dependances externes** : aucune (UploadThing deja en place)

**Effort** : M-L (5-10 jours) — le hotspot editor (click-to-tag sur image) est complexe

---

### 6. Guide des tailles interactif

> **✅ DEJA IMPLEMENTE**

**Etat actuel** : `modules/skus/components/size-guide-dialog.tsx` — modale statique avec guides pour bagues et bracelets, integree aux pages produit.

**Ameliorations possibles** :

- Outil de mesure interactif (drag-to-measure sur ecran tactile)
- Generation de gabarit PDF imprimable
- Recommandation basee sur les achats precedents du client
- Ajout de guides pour d'autres types de bijoux (colliers, boucles d'oreilles)

**Effort ameliorations** : S (1-3 jours) pour le PDF, M (3-7 jours) pour l'outil interactif

---

### 7. Wishlist partageable / Liste de souhaits

- La wishlist existe deja, mais la rendre partageable via lien public
- Page publique "Liste de souhaits de [Prenom]"
- Ideal pour anniversaires, Noel, mariages
- Option de marquer un article comme "offert" (pour eviter les doublons)
- **Pourquoi** : Transforme la wishlist en outil d'acquisition (partage social).

**Etat actuel** : ⚠️ Partiel — la wishlist est beaucoup plus riche que decrit initialement :

- `modules/wishlist/` — 38 fichiers, module complet
- Back-in-stock notifications automatiques (`notify-back-in-stock.ts`)
- Guest/auth wishlist merge a la connexion
- Session expiry management
- Toggle add/remove depuis les pages produit
- **Manque** : partage public, lien unique, page publique

**Ce qui manque** :

- Champ `shareToken` (String unique) sur la wishlist ou l'utilisateur
- Route publique `/liste-de-souhaits/[token]` (server component, pas d'auth requise)
- Bouton "Partager ma liste" dans `/compte/liste-de-souhaits`
- Option "Marquer comme offert" (champ `giftedBy` sur `WishlistItem`)
- Open Graph meta tags pour le partage social

**Points d'integration** :

- Module wishlist existant : ajouter le share token + route publique
- Composants existants : reutiliser les cartes produit de la wishlist
- SEO : meta tags OG pour le lien partage

**Modeles Prisma** :

```prisma
// Ajout sur le modele existant
model Wishlist {
  // ... champs existants
  shareToken String? @unique @default(cuid())
  isPublic   Boolean @default(false)
}

model WishlistItem {
  // ... champs existants
  giftedBy   String? // prenom de la personne qui offre
  giftedAt   DateTime?
}
```

**Fichiers cles a creer/modifier** :

- `app/(boutique)/liste-de-souhaits/[token]/page.tsx` — page publique
- Modifier `modules/wishlist/` — actions share/unshare, composant bouton partage
- Migration Prisma

**Dependances externes** : aucune

**Effort** : S (1-3 jours)

---

### 8. Blog / Journal de l'atelier

- Articles sur les techniques, les materiaux, les coulisses de creation
- SEO : contenu long format avec mots-cles bijouterie
- Liens vers les produits mentionnes
- Categories : inspirations, entretien, actualites
- Admin : editeur WYSIWYG, brouillons, publication programmee
- **Pourquoi** : SEO organique + positionnement artisanal + engagement.

**Etat actuel** : ❌ Absent — aucun modele Article/BlogPost, aucune infra editoriale.

**Ce qui manque** :

- Modeles Prisma `BlogPost` + `BlogCategory`
- Editeur WYSIWYG admin (TipTap ou similar)
- Pages publiques `/journal`, `/journal/[slug]`
- Admin CRUD (`/admin/contenu/journal`)
- RSS feed
- Schema JSON-LD `BlogPosting` + `Article`
- Sitemap dynamique pour les articles

**Points d'integration** :

- Admin CRUD pattern : copier le pattern existant
- UploadThing : images dans les articles
- SEO : schema JSON-LD (pattern existant dans `structured-data.tsx`)
- Product linking : relation many-to-many avec `Product`

**Modeles Prisma** :

```prisma
model BlogPost {
  id          String        @id @default(cuid())
  title       String
  slug        String        @unique
  excerpt     String?
  content     String        // HTML from WYSIWYG
  coverImage  String?
  categoryId  String?
  category    BlogCategory? @relation(fields: [categoryId], references: [id])
  products    Product[]     // many-to-many
  status      PostStatus    @default(DRAFT)
  publishedAt DateTime?
  authorId    String
  author      User          @relation(fields: [authorId], references: [id])
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model BlogCategory {
  id    String     @id @default(cuid())
  name  String     @unique
  slug  String     @unique
  posts BlogPost[]
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

**Fichiers cles a creer** :

- `modules/blog/` — module complet (~25 fichiers)
- `app/(boutique)/journal/page.tsx` + `[slug]/page.tsx`
- `app/admin/contenu/journal/` — admin CRUD
- `app/journal/rss.xml/route.ts` — RSS feed
- Migration Prisma

**Dependances externes** :

- Editeur WYSIWYG : `@tiptap/react` + extensions (~50KB gzipped, tree-shakable)

**Effort** : L (1-2 semaines) — l'editeur WYSIWYG est le point complexe

---

## Tier 3 — Ameliorations operationnelles

### 9. Notifications push (PWA)

- Le projet est deja PWA (Serwist), mais pas de notifications push
- Alertes : commande expediee, retour en stock wishlist, vente flash
- Opt-in/opt-out granulaire par type de notification
- **Pourquoi** : Canal de communication direct, taux d'ouverture 5-10x superieur aux emails.

**Etat actuel** : ❌ Absent — PWA Serwist fonctionnelle (service worker, offline, cache strategies), mais 0 push subscription code, pas de dependance `web-push`.

> **Note** : les notifications back-in-stock existent deja par **email** via `modules/wishlist/services/notify-back-in-stock.ts`. Les notifications push seraient un canal supplementaire.

**Ce qui manque** :

- Modele Prisma `PushSubscription` (userId, endpoint, p256dh, auth, createdAt)
- Service worker : handler `push` event dans `app/serwist/`
- API route pour enregistrer/supprimer les subscriptions
- Server-side push via `web-push` library
- UI opt-in banner + preferences granulaires dans `/compte/notifications`
- Generation VAPID keys (env vars)

**Points d'integration** :

- Serwist service worker existant : ajouter le handler `push` + `notificationclick`
- Back-in-stock service : ajouter un canal push en plus de l'email
- Checkout webhook : notification "commande expediee"
- Preferences utilisateur : etendre le profil existant

**Modeles Prisma** :

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
}
```

**Fichiers cles a creer** :

- `modules/notifications/` — module (~15 fichiers)
- `app/api/push-subscription/route.ts` — API subscribe/unsubscribe
- Modifier `app/serwist/` — handlers push + notificationclick
- `app/(boutique)/compte/notifications/page.tsx` — preferences
- Migration Prisma

**Dependances externes** :

- `web-push` — librairie Node.js pour envoyer les notifications push

**Effort** : M (3-7 jours)

---

### 10. Systeme de precommande / Coming Soon

- Produits marques "Bientot disponible" avec bouton "Me prevenir"
- Collecte d'emails d'intention d'achat avant le lancement
- Notification automatique quand le produit est disponible
- Option de precommande avec paiement differe
- **Pourquoi** : Cree de l'anticipation et valide la demande avant production.

**Etat actuel** : ❌ Absent — pas de statut `COMING_SOON` dans `ProductStatus`, pas de preorder flow.

**Ce qui manque** :

- Ajout `COMING_SOON` dans l'enum `ProductStatus`
- Modele `PreorderNotification` (email, productId, notifiedAt)
- Bouton "Me prevenir" sur la page produit (quand status = COMING_SOON)
- Admin : marquer un produit comme "coming soon" avec date de disponibilite
- Cron ou trigger pour envoyer les notifications quand le produit passe en `ACTIVE`
- Email template "Votre produit est maintenant disponible"

**Points d'integration** :

- Back-in-stock notification pattern : quasi-identique, reutiliser le service `notify-back-in-stock.ts` comme modele
- `ProductStatus` enum : ajouter `COMING_SOON`
- Storefront : conditionnel "Ajouter au panier" vs "Me prevenir" selon le statut
- Cron infra : job de notification (ou hook sur changement de statut)

**Modeles Prisma** :

```prisma
// Ajout a l'enum existant
enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
  COMING_SOON // nouveau
}

model PreorderNotification {
  id         String    @id @default(cuid())
  email      String
  productId  String
  product    Product   @relation(fields: [productId], references: [id])
  notifiedAt DateTime?
  createdAt  DateTime  @default(now())

  @@unique([email, productId])
  @@index([productId])
}
```

**Fichiers cles a creer/modifier** :

- `modules/preorder/` — module (~10 fichiers)
- Modifier pages produit — conditionnel bouton selon statut
- Modifier admin catalogue — option "Coming Soon"
- `emails/preorder-available.tsx` — template notification
- Migration Prisma

**Dependances externes** : aucune

**Effort** : M (3-7 jours)

---

### 11. Dashboard analytics avance (admin)

- Le dashboard actuel a KPIs + revenue chart + recent orders
- Ajouter : taux de conversion, panier moyen, produits les plus vus vs achetes
- Cohortes clients (nouveau vs recurrent)
- Top produits par revenu, par marge, par avis
- Graphique d'entonnoir checkout (ajout panier → paiement → confirmation)
- Export PDF du rapport mensuel
- **Pourquoi** : Aide a prendre des decisions eclairees sur le catalogue et le marketing.

**Etat actuel** : ⚠️ Partiel — le dashboard admin existe avec :

- `app/admin/(tableau-de-bord)/page.tsx` — page principale
- KPIs : revenue, commandes, clients, produits
- Revenue chart (graphique)
- Recent orders table
- PostHog events deja trackes : `product_viewed`, `checkout_started`, `purchase_completed`

**Ce qui manque** :

- Calcul taux de conversion (PostHog events → ratio checkout_started/purchase_completed)
- AOV (Average Order Value) — calcul simple sur les commandes
- Cohortes clients (Prisma query : first order date → group by month)
- Top produits par revenu/avis (Prisma aggregation)
- Entonnoir checkout (PostHog funnel ou calcul maison)
- Export PDF (`@react-pdf/renderer` ou generation server-side)

**Points d'integration** :

- PostHog : events existants sont la base pour le funnel et le taux de conversion
- Prisma aggregations : `groupBy`, `aggregate` pour les KPIs avances
- Dashboard existant : ajouter des onglets/sections supplementaires
- Caching : `"use cache"` + `cacheLife("dashboard")` pour les calculs lourds

**Fichiers cles a creer/modifier** :

- `modules/analytics/` — module (~15 fichiers, services de calcul)
- Modifier `app/admin/(tableau-de-bord)/` — nouvelles sections/onglets
- Composants graphiques (recharts deja utilise ? sinon ajouter)

**Dependances externes** :

- Librairie graphique si pas deja presente
- `@react-pdf/renderer` pour l'export PDF (optionnel)

**Effort** : L (1-2 semaines) — calculs complexes + UI graphiques + export PDF

---

### 12. Portail retours client (self-service)

- Le systeme de refunds existe, mais pas de portail client self-service
- Le client initie sa demande de retour depuis son espace (motif, photos)
- Generation automatique d'etiquette retour (Colissimo API)
- Suivi du retour cote client et admin
- **Pourquoi** : Reduit la charge admin et ameliore l'experience post-achat.

**Etat actuel** : ⚠️ Partiel — le systeme de refunds est complet cote admin :

- `modules/refunds/` — 65 fichiers, module mature
- 6 statuts de refund (PENDING → APPROVED → CONFIRMED → etc.)
- Actions, data, services, composants admin
- Integration Stripe Refund
- **Manque** : tout le cote client (initiation, suivi, etiquette)

**Ce qui manque** :

- Pages client `/compte/commandes/[id]/retour` — formulaire de demande
- Upload photos du produit a retourner (UploadThing)
- Email automatique avec instructions de retour
- Suivi du retour dans l'espace client
- Integration Colissimo API pour l'etiquette retour (optionnel, peut etre manuel au debut)

**Points d'integration** :

- Module refunds existant : ajouter des actions client-side (create return request)
- Auth : `requireAuth()` pour les actions client
- UploadThing : upload photos retour
- Email infra : template "Demande de retour recue" + "Etiquette retour"
- Admin : les refunds existants recevront les demandes client

**Fichiers cles a creer/modifier** :

- `app/(boutique)/compte/commandes/[id]/retour/page.tsx` — formulaire
- Modifier `modules/refunds/actions/` — action client-side
- `emails/return-request-*.tsx` — 2 templates
- Modifier admin pour voir l'origine (client vs admin)

**Dependances externes** :

- Colissimo API (optionnel, V2 a evaluer)

**Effort** : M (3-7 jours) — le backend refund existe deja, c'est principalement du frontend + une action

---

## Tier 4 — Innovation & experimentation

### 13. Gravure / Personnalisation structuree

- Le module customization existe pour des demandes libres
- Ajouter une personnalisation structuree : gravure texte (prenom, date, initiales)
- Previsualisation en temps reel sur la photo du produit (canvas/SVG)
- Supplement de prix configurable par produit
- Polices et limites de caracteres configurables
- **Pourquoi** : Les bijoux graves ont une marge superieure et un taux de retour quasi nul.

**Etat actuel** : ⚠️ Partiel — le module customization est un systeme de **demande libre** :

- `CustomizationRequest` (Prisma) — texte libre + photos uploadees
- `CustomizationMedia` — medias associes a la demande
- Workflow admin : validation, discussion, confirmation
- **Ce n'est PAS** de la personnalisation produit structuree avec preview

**Ce qui manque** :

- Configuration par produit : quels produits sont gravables, polices, limites caracteres
- UI de saisie structuree : champ texte avec compteur, select police, preview
- Preview temps reel : overlay SVG/Canvas sur la photo produit
- Prix supplementaire : logique dans le checkout
- Champs sur `CartItem` : `engravingText`, `engravingFont`

**Points d'integration** :

- Product admin : ajouter config gravure (gravable oui/non, polices, prix supplement)
- Page produit : section gravure conditionnelle
- Checkout : inclure le supplement dans le prix
- Order detail admin : afficher la gravure commandee
- Email confirmation : inclure le detail de gravure

**Modeles Prisma** :

```prisma
// Ajout sur Product existant
model Product {
  // ... champs existants
  engravable       Boolean @default(false)
  engravingPrice   Int?    // supplement en centimes
  engravingMaxChars Int?
}

// Ajout sur CartItem / OrderItem
model OrderItem {
  // ... champs existants
  engravingText String?
  engravingFont String?
}
```

**Fichiers cles a creer/modifier** :

- `modules/engraving/components/engraving-preview.tsx` — preview SVG
- `modules/engraving/components/engraving-form.tsx` — formulaire saisie
- Modifier page produit — section gravure conditionnelle
- Modifier checkout — supplement prix
- Modifier admin produit — config gravure
- Migration Prisma

**Dependances externes** : aucune (SVG natif)

**Effort** : M-L (5-10 jours) — la preview temps reel est le point complexe

---

### 14. Configurateur de bijou (Build Your Own)

- Choisir une base (bague, collier, bracelet)
- Selectionner le materiau (argent, or, vermeil)
- Ajouter des pierres / pendentifs
- Prix calcule dynamiquement
- Rendu visuel en temps reel
- **Pourquoi** : Experience premium, panier moyen eleve, differenciation forte.

**Etat actuel** : ❌ Absent — aucune infra. C'est la feature la plus complexe de la liste.

**Ce qui manque** :

- Modeles Prisma : `ConfiguratorBase`, `ConfiguratorOption`, `ConfiguratorPricing`
- UI multi-step (wizard) avec preview visuel
- Calcul de prix dynamique (base + materiaux + pierres)
- Systeme de rendu visuel (layers d'images ou 3D simple)
- Integration panier : ajouter une configuration custom au panier
- Admin : gerer les bases, options, compatibilites, prix

**Points d'integration** :

- Checkout : le configurateur genere un `CartItem` avec metadata custom
- Admin CRUD pattern : gestion des options
- UploadThing : images des options/rendus

**Fichiers cles a creer** :

- `modules/configurator/` — module complet (~30+ fichiers)
- `app/(boutique)/boutique/configurateur/page.tsx` — wizard public
- `app/admin/catalogue/configurateur/` — admin gestion
- Migration Prisma majeure

**Dependances externes** :

- Potentiellement une librairie de rendu visuel (canvas layers)

**Effort** : XL (2-4 semaines) — architecture complexe, UI multi-step, rendu visuel, calcul prix

---

### 15. Ventes flash / Live Shopping

- Page de vente flash avec countdown timer
- Stock limite visible (urgence)
- Notification push/email aux abonnes
- Historique des ventes flash passees
- **Pourquoi** : Cree de l'urgence et des pics de trafic planifiables.

**Etat actuel** : ❌ Absent — le modele `Discount` a `startsAt`/`endsAt` (base temporelle), mais pas de page flash sale dediee ni de mecanisme d'urgence.

**Ce qui manque** :

- Modele `FlashSale` (titre, description, startsAt, endsAt, products, discountId)
- Page publique `/boutique/ventes-flash` avec countdown + produits
- Admin : creer/programmer des ventes flash (`/admin/marketing/ventes-flash`)
- Cron d'activation/desactivation automatique
- Notification email/push aux abonnes quand une vente flash demarre
- Bandeau/badge "Vente flash" sur les produits concernes

**Points d'integration** :

- `Discount` system : chaque flash sale cree un Discount avec dates
- Cron infra : job d'activation (similaire a `process-scheduled-discounts`)
- Email/push : notification de lancement
- Storefront : badge "Vente flash" sur les cartes produit
- Announcement bar : afficher les ventes flash en cours

**Modeles Prisma** :

```prisma
model FlashSale {
  id          String      @id @default(cuid())
  title       String
  description String?
  startsAt    DateTime
  endsAt      DateTime
  discountId  String
  discount    Discount    @relation(fields: [discountId], references: [id])
  products    Product[]   // many-to-many
  notified    Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}
```

**Fichiers cles a creer** :

- `modules/flash-sales/` — module complet (~20 fichiers)
- `app/(boutique)/boutique/ventes-flash/page.tsx` — page publique
- `app/admin/marketing/ventes-flash/` — admin CRUD
- `emails/flash-sale-start.tsx` — template notification
- Cron job dans `modules/cron/services/`
- Migration Prisma

**Dependances externes** : aucune

**Effort** : M (3-7 jours) — le `Discount` system et le cron pattern simplifient l'implementation

---

## Recapitulatif par effort d'implementation

| #   | Fonctionnalite             | Etat | Effort | Impact | Priorite suggeree |
| --- | -------------------------- | ---- | ------ | ------ | ----------------- |
| 3   | Emballage cadeau & message | ❌   | S      | Fort   | 1                 |
| 7   | Wishlist partageable       | ⚠️   | S      | Moyen  | 2                 |
| 6   | Guide des tailles          | ✅   | —      | —      | — (deja fait)     |
| 10  | Precommande / Coming Soon  | ❌   | M      | Fort   | 3                 |
| 12  | Portail retours client     | ⚠️   | M      | Moyen  | 4                 |
| 4   | Parrainage                 | ❌   | M      | Fort   | 5                 |
| 15  | Ventes flash               | ❌   | M      | Moyen  | 6                 |
| 9   | Notifications push         | ❌   | M      | Moyen  | 7                 |
| 13  | Gravure structuree         | ⚠️   | M-L    | Fort   | 8                 |
| 5   | Lookbook                   | ❌   | M-L    | Moyen  | 9                 |
| 2   | Gift Cards                 | ❌   | L      | Fort   | 10                |
| 1   | Programme fidelite         | ❌   | L      | Fort   | 11                |
| 8   | Blog / Journal             | ❌   | L      | Moyen  | 12                |
| 11  | Dashboard analytics avance | ⚠️   | L      | Moyen  | 13                |
| 14  | Configurateur bijou        | ❌   | XL     | Fort   | 14                |

**S** = 1-3 jours · **M** = 3-7 jours · **L** = 1-2 semaines · **XL** = 2-4 semaines

### Corrections par rapport a la version precedente

| Feature           | Ancien effort | Nouveau effort | Raison                                                 |
| ----------------- | ------------- | -------------- | ------------------------------------------------------ |
| Guide des tailles | S             | ✅ Deja fait   | `size-guide-dialog.tsx` en production                  |
| Gift Cards        | M             | L              | Modele Prisma + checkout + emails + admin + page achat |
| Lookbook          | M             | M-L            | Hotspot editor complexe                                |
| Gravure           | M             | M-L            | Preview SVG temps reel                                 |
| Configurateur     | XL            | XL (2-4 sem.)  | Complexite confirmee                                   |
