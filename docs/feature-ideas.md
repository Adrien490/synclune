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

### 16. Bouton "Commander a nouveau" (Reorder)

- Depuis le detail d'une commande passee, un clic re-ajoute tous les articles au panier
- Verifie la disponibilite de chaque SKU avant ajout
- Feedback clair sur les articles en rupture de stock
- **Pourquoi** : Simplifie le reachat pour les clients fideles (bijoux consommables : chaines, boucles depareillees).

**Etat actuel** : ❌ Absent — aucune action de reorder dans le codebase. L'action `add-to-cart` existe et fonctionne SKU par SKU.

**Ce qui manque** :

- Server action `reorder-from-order.ts` qui boucle sur `order.items`, verifie le stock de chaque SKU, et appelle `add-to-cart` pour chacun
- Composant `ReorderButton` avec feedback (toast succes/partiel/echec)
- Integration dans `order-detail-content.tsx` (detail commande cote client)

**Points d'integration** :

- `modules/cart/actions/add-to-cart.ts` — action existante, reutilisable directement
- `modules/orders/components/order-detail-content.tsx` — point d'insertion du bouton
- `modules/skus/` — verification stock via les services existants
- Toast/feedback pattern existant dans le projet

**Fichiers cles a creer/modifier** :

- `modules/orders/actions/reorder-from-order.ts` — nouvelle action
- `modules/orders/components/reorder-button.tsx` — composant bouton
- Modifier `modules/orders/components/order-detail-content.tsx` — integrer le bouton

**Dependances externes** : aucune

**Effort** : XS (quelques heures) — reutilise integralement l'infra existante

---

### 17. Campagnes newsletter broadcast

- Interface admin pour composer et envoyer des newsletters a la liste d'abonnes
- Editeur de contenu (sujet, corps HTML via React Email)
- Envoi via `Resend batch.send()` a tous les abonnes opt-in
- Historique des campagnes envoyees avec stats (envoyes, ouverts)
- **Pourquoi** : La liste d'abonnes existe (double opt-in, stats) mais il n'y a AUCUN moyen d'envoyer des campagnes. L'infra est la, il manque le "dernier kilometre".

**Etat actuel** : ❌ Absent — le module `newsletter/` gere les abonnements (subscribe, confirm, unsubscribe, promo code) mais aucune fonctionnalite d'envoi de campagne.

**Ce qui manque** :

- Modele Prisma `NewsletterCampaign` (subject, content, status, sentAt, stats)
- Page admin `/admin/marketing/newsletter/campagnes` — CRUD + compose + preview + send
- Template React Email generique pour les campagnes
- Service d'envoi batch via Resend (`batch.send()`)
- Tracking ouvertures via Resend webhooks (optionnel)

**Points d'integration** :

- `modules/newsletter/` — reutiliser la liste d'abonnes confirmes
- Email infra (Resend + React Email) — deja en place
- Admin CRUD pattern — copier le pattern existant
- Rate limiting — Resend free tier = 100 emails/jour, evaluer les limites

**Fichiers cles a creer** :

- `modules/newsletter/actions/send-campaign.ts` — action envoi
- `modules/newsletter/data/get-campaigns.ts` — listing campagnes
- `modules/newsletter/services/broadcast.service.ts` — logique batch send
- `modules/newsletter/components/campaign-*.tsx` — composants admin (form, list, preview)
- `app/admin/marketing/newsletter/campagnes/page.tsx` — page admin
- `emails/newsletter-campaign.tsx` — template generique
- Migration Prisma

**Dependances externes** : aucune (Resend deja en place)

**Effort** : M (3-7 jours) — l'editeur de contenu et le batch send sont les points principaux

---

### 18. Portefeuille codes promo client

- Page `/compte/mes-reductions` listant les codes promo actifs et non utilises du client
- Affiche : code, reduction, date d'expiration, conditions
- Lien direct vers la boutique avec le code pre-applique
- **Pourquoi** : Les clients recoivent des codes par email (newsletter, parrainage) mais n'ont aucun endroit pour les retrouver. Reduit les demandes support et augmente l'utilisation des codes.

**Etat actuel** : ❌ Absent — `DiscountUsage` track les usages, les `Discount` ont des champs `perUserLimit` et `userId`, mais aucune vue client n'existe.

**Ce qui manque** :

- Page client `/compte/mes-reductions`
- Query Prisma : codes actifs (non expires, non epuises, assignes a l'utilisateur ou universels avec usage restant)
- Composant card affichant chaque code avec ses details
- Lien "Appliquer" qui redirige vers la boutique avec le code en query param

**Points d'integration** :

- `modules/discounts/` — modeles et data existants
- `DiscountUsage` — pour calculer les usages restants par user
- Layout compte client — ajouter un lien dans la navigation
- Checkout form — supporter l'application automatique via query param (optionnel)

**Fichiers cles a creer/modifier** :

- `modules/discounts/data/get-user-discounts.ts` — query codes actifs du client
- `modules/discounts/components/discount-wallet-card.tsx` — composant card
- `app/(boutique)/compte/mes-reductions/page.tsx` — page client
- Modifier navigation compte client — ajouter le lien

**Dependances externes** : aucune

**Effort** : S (1-3 jours) — zero nouveau modele, juste une query + une page

---

## Tier 2 — Differenciation & engagement (suite)

### 19. Q&A produit

- Section questions/reponses sur chaque page produit
- Les clients posent des questions, l'admin repond
- Notification email a l'admin quand une question est posee
- Notification email au client quand sa question recoit une reponse
- FAQ JSON-LD par produit (SEO)
- **Pourquoi** : Reduit les emails de support pre-achat, ameliore le SEO, et augmente la confiance.

**Etat actuel** : ❌ Absent — aucun modele `ProductQuestion`, rien cote Q&A. Le module FAQ existe pour les questions generales mais pas au niveau produit.

**Ce qui manque** :

- Modeles Prisma `ProductQuestion` + `ProductAnswer`
- Section Q&A sur la page produit (sous les reviews)
- Formulaire de question (auth requise ou email)
- Interface admin pour repondre aux questions
- Emails : notification admin (nouvelle question) + notification client (reponse)
- JSON-LD `FAQPage` par produit (questions les plus utiles)

**Points d'integration** :

- Page produit : ajouter une section sous les reviews
- Module FAQ existant : pattern similaire (question/reponse), reutiliser les composants UI
- Admin : ajouter dans le detail produit ou route dediee
- Email infra : 2 nouveaux templates
- SEO : `FAQPage` JSON-LD (pattern existant dans `structured-data.tsx`)

**Fichiers cles a creer** :

- `modules/product-qa/` — module complet (~15 fichiers)
- `modules/product-qa/components/qa-section.tsx` — section page produit
- `modules/product-qa/components/question-form.tsx` — formulaire
- `modules/product-qa/actions/ask-question.ts` — action client
- `modules/product-qa/actions/answer-question.ts` — action admin
- `emails/product-question-*.tsx` — 2 templates (notification admin + reponse client)
- Migration Prisma

**Dependances externes** : aucune

**Effort** : M (3-7 jours)

---

### 20. Tags produit

- Tags libres sur les produits pour des filtres transversaux
- Exemples : "Cadeau Noel", "Hypoallergenique", "Mariage", "Ete 2026"
- Filtrage par tag dans la boutique (en complement des collections et types)
- Admin : gerer les tags, assigner aux produits
- Pages SEO par tag (`/boutique/tag/[slug]`)
- **Pourquoi** : Les produits sont categorises uniquement par Collection et ProductType. Les tags permettent des axes transversaux (occasion, propriete, saison) sans creer de nouvelles collections.

**Etat actuel** : ❌ Absent — aucun modele `ProductTag`, aucun systeme de tagging.

**Ce qui manque** :

- Modele Prisma `ProductTag` + relation many-to-many avec `Product`
- Admin : CRUD tags + assignation aux produits (dans le formulaire produit)
- Storefront : filtre par tag dans la boutique
- Pages tag : `/boutique/tag/[slug]` avec listing produits
- Sitemap dynamique pour les pages tag

**Points d'integration** :

- Admin catalogue : ajouter un champ tags dans le formulaire produit (multi-select)
- Boutique : integrer dans les filtres existants (sidebar/mobile filters)
- Fuzzy search : inclure les tags dans la recherche
- SEO : pages tag indexables

**Fichiers cles a creer/modifier** :

- `modules/tags/` — module (~10 fichiers)
- `app/(boutique)/boutique/tag/[slug]/page.tsx` — page tag
- Modifier admin formulaire produit — champ multi-select tags
- Modifier filtres boutique — ajouter filtre par tag
- Migration Prisma

**Dependances externes** : aucune

**Effort** : S-M (3-5 jours)

---

## Tier 3 — Ameliorations operationnelles (suite)

### 21. Pages admin manquantes

- 5 routes existent dans `navigation-config.tsx` mais n'ont pas de `page.tsx`
- `/admin/clients` — listing clients, historique commandes, stats
- `/admin/systeme/litiges` — suivi des litiges Stripe (disputes)
- `/admin/systeme/audit` — journal d'audit des actions admin
- `/admin/systeme/webhooks` — monitoring des webhook events
- `/admin/systeme/emails` — historique des emails envoyes (dead-letter queue)
- **Pourquoi** : Les liens de navigation existent et menent a des 404. Tous les modeles et composants sous-jacents existent deja.

**Etat actuel** : ⚠️ Partiel — les routes sont configurees dans la navigation admin, les modeles Prisma existent (`User`, `WebhookEvent`, `EmailLog`, etc.), mais les fichiers `page.tsx` manquent.

**Ce qui manque** :

- 5 fichiers `page.tsx` avec les composants de listing/detail
- Queries data/ avec cache pour chaque page
- Composants table/list pour afficher les donnees

**Points d'integration** :

- Admin CRUD pattern existant — copier le pattern des pages existantes (commandes, catalogue)
- Modeles Prisma existants — juste des queries a ecrire
- Navigation admin — les liens existent deja

**Fichiers cles a creer** :

- `app/admin/clients/page.tsx` — listing clients
- `app/admin/systeme/litiges/page.tsx` — litiges Stripe
- `app/admin/systeme/audit/page.tsx` — journal d'audit
- `app/admin/systeme/webhooks/page.tsx` — webhook events
- `app/admin/systeme/emails/page.tsx` — historique emails
- Queries `data/` correspondantes pour chaque page

**Dependances externes** : aucune

**Effort** : M (3-7 jours) — 5 pages independantes, pattern repetitif

---

### 22. Alertes stock bas

- Notification admin quand un SKU passe sous un seuil configurable
- Seuil configurable par SKU (champ `lowStockThreshold` sur `ProductSku`)
- Email admin recapitulatif des SKUs en stock bas
- Indicateur visuel dans l'admin catalogue
- **Pourquoi** : `LOW_STOCK_THRESHOLD` existe pour le badge storefront mais aucune notification admin. Risque de rupture silencieuse.

**Etat actuel** : ⚠️ Partiel — le badge "Stock bas" est affiche sur le storefront via une constante globale, mais aucune alerte proactive vers l'admin.

**Ce qui manque** :

- Champ `lowStockThreshold` sur `ProductSku` (seuil par SKU, fallback sur constante globale)
- Cron job qui verifie les niveaux de stock et envoie un email recapitulatif
- Email template admin "Alerte stock bas" avec liste des SKUs concernes
- Badge/indicateur dans la liste produits admin

**Points d'integration** :

- `modules/skus/` — ajouter le champ et la logique
- Cron infra — nouveau job (ex: daily 8:00)
- Email infra — nouveau template admin
- Admin catalogue — badge visuel sur les lignes produit

**Fichiers cles a creer/modifier** :

- `modules/cron/services/low-stock-alerts.service.ts` — service cron
- `app/api/cron/low-stock-alerts/route.ts` — route cron
- `emails/admin-low-stock-alert.tsx` — template email
- Modifier `prisma/schema.prisma` — champ `lowStockThreshold`
- Modifier admin catalogue — badge stock bas
- Ajouter le job dans `vercel.json`
- Migration Prisma

**Dependances externes** : aucune

**Effort** : S (1-3 jours)

---

### 23. Page contact

- Page publique `/contact` avec formulaire de contact
- Champs : nom, email, sujet (select), message
- Envoi d'email a l'admin + email de confirmation au client
- Rate limiting pour eviter le spam
- **Pourquoi** : Aucune route `/contact` n'existe. L'email est visible uniquement dans les CGV. Barriere inutile pour les prospects.

**Etat actuel** : ❌ Absent — pas de page contact, pas de formulaire, pas de route.

**Ce qui manque** :

- Page `/contact` avec formulaire TanStack Form
- Server action `send-contact-message.ts`
- 2 emails : notification admin + confirmation client
- Schema Zod pour la validation
- Rate limiting (Arcjet ou in-memory)

**Points d'integration** :

- TanStack Form + `useAppForm` — pattern existant
- Email infra — 2 nouveaux templates
- Rate limiting — pattern existant dans les server actions
- Layout boutique — ajouter dans la navigation/footer

**Fichiers cles a creer** :

- `app/(boutique)/contact/page.tsx` — page publique
- `modules/contact/actions/send-contact-message.ts` — server action
- `modules/contact/schemas/contact.schema.ts` — validation Zod
- `modules/contact/components/contact-form.tsx` — formulaire
- `emails/contact-notification.tsx` — notification admin
- `emails/contact-confirmation.tsx` — confirmation client

**Dependances externes** : aucune

**Effort** : S (1-3 jours)

---

## Tier 4 — Securite & infra

### 24. Authentification deux facteurs (2FA/TOTP)

- Activation optionnelle du 2FA via application TOTP (Google Authenticator, Authy)
- Page de setup avec QR code + code secret
- Recovery codes en cas de perte de l'appareil
- Enforcement possible pour les admins
- **Pourquoi** : Better Auth supporte TOTP nativement via le plugin `twoFactor()`. Zero 2FA dans le codebase actuel malgre la gestion de donnees sensibles (commandes, paiements, donnees clients).

**Etat actuel** : ❌ Absent — Better Auth est configure sans le plugin `twoFactor()`. Aucune reference a TOTP, 2FA, ou recovery codes dans le codebase.

**Ce qui manque** :

- Plugin `twoFactor()` dans la config Better Auth (server + client)
- Page de setup 2FA dans le compte utilisateur (`/compte/securite`)
- Generation et affichage du QR code TOTP
- Saisie du code TOTP au login (flow conditionnel)
- Recovery codes : generation, affichage unique, stockage hash
- Option admin : forcer le 2FA pour les comptes admin

**Points d'integration** :

- Better Auth config (`modules/auth/lib/`) — ajouter le plugin `twoFactor()`
- Flow de login — ecran intermediaire si 2FA active
- Compte client — page securite pour activer/desactiver
- Admin — enforcement possible via config

**Fichiers cles a creer/modifier** :

- Modifier `modules/auth/lib/auth.ts` — ajouter plugin `twoFactor()`
- Modifier `modules/auth/lib/auth-client.ts` — client-side plugin
- `app/(boutique)/compte/securite/page.tsx` — page setup 2FA
- `modules/auth/components/totp-verify-form.tsx` — formulaire verification code
- `modules/auth/components/recovery-codes-display.tsx` — affichage recovery codes
- Modifier flow de login — ecran TOTP conditionnel

**Dependances externes** : aucune (Better Auth gere TOTP nativement)

**Effort** : M (3-7 jours) — Better Auth fait le gros du travail, reste l'UI et les flows

---

## Quick wins / Micro-corrections

Ces items sont trop petits pour etre des features a part entiere mais meritent d'etre notes :

| Item                           | Description                                                                                                                  | Effort  | Fichier(s)                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| Import bouton facture          | Le composant `InvoiceDownloadButton` et l'API route existent mais le bouton n'est pas importe dans le detail commande client | ~10 min | `modules/orders/components/order-detail-content.tsx` |
| Affichage estimation livraison | `estimatedDelivery` est calcule et stocke sur `Order` mais pas affiche cote client                                           | ~30 min | Detail commande client + email confirmation          |
| Events PostHog manquants       | Certains events declares dans les types ne sont pas tous emis (ex: `wishlist_shared`, `gift_card_purchased`)                 | ~1h     | Fichiers actions concernes                           |

---

## Recapitulatif par effort d'implementation

| #   | Fonctionnalite                | Etat | Effort | Impact | Priorite suggeree |
| --- | ----------------------------- | ---- | ------ | ------ | ----------------- |
| 16  | Reorder (commander a nouveau) | ❌   | XS     | Fort   | 1                 |
| 3   | Emballage cadeau & message    | ❌   | S      | Fort   | 2                 |
| 18  | Portefeuille codes promo      | ❌   | S      | Moyen  | 3                 |
| 22  | Alertes stock bas             | ⚠️   | S      | Moyen  | 4                 |
| 23  | Page contact                  | ❌   | S      | Moyen  | 5                 |
| 7   | Wishlist partageable          | ⚠️   | S      | Moyen  | 6                 |
| 6   | Guide des tailles             | ✅   | —      | —      | — (deja fait)     |
| 10  | Precommande / Coming Soon     | ❌   | M      | Fort   | 7                 |
| 17  | Campagnes newsletter          | ❌   | M      | Fort   | 8                 |
| 12  | Portail retours client        | ⚠️   | M      | Moyen  | 9                 |
| 4   | Parrainage                    | ❌   | M      | Fort   | 10                |
| 19  | Q&A produit                   | ❌   | M      | Moyen  | 11                |
| 21  | Pages admin manquantes        | ⚠️   | M      | Moyen  | 12                |
| 24  | 2FA / TOTP                    | ❌   | M      | Moyen  | 13                |
| 15  | Ventes flash                  | ❌   | M      | Moyen  | 14                |
| 9   | Notifications push            | ❌   | M      | Moyen  | 15                |
| 20  | Tags produit                  | ❌   | S-M    | Moyen  | 16                |
| 13  | Gravure structuree            | ⚠️   | M-L    | Fort   | 17                |
| 5   | Lookbook                      | ❌   | M-L    | Moyen  | 18                |
| 2   | Gift Cards                    | ❌   | L      | Fort   | 19                |
| 1   | Programme fidelite            | ❌   | L      | Fort   | 20                |
| 8   | Blog / Journal                | ❌   | L      | Moyen  | 21                |
| 11  | Dashboard analytics avance    | ⚠️   | L      | Moyen  | 22                |
| 14  | Configurateur bijou           | ❌   | XL     | Fort   | 23                |

**XS** = quelques heures · **S** = 1-3 jours · **M** = 3-7 jours · **L** = 1-2 semaines · **XL** = 2-4 semaines

                                |
