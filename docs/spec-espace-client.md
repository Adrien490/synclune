# Spec technique - Espace client Synclune

> Ce document detaille les fonctionnalites de l'espace client (A-M) + la navigation, avec pour chaque item : le statut d'implementation, les fichiers a creer/modifier, les patterns a suivre, les donnees disponibles, et les dependances.
>
> **Les pages ont ete supprimees** (`app/(boutique)/(espace-client)/`) pour etre reconstruites de zero. Tous les composants modules, actions, data, hooks et services restent intacts. La page favoris est dans `app/(boutique)/favoris/` (hors espace-client, accessible sans authentification).

---

> **⚠ Decisions a trancher avant implementation**
>
> Les points suivants sont bloquants ou impactants et doivent etre tranches avant de commencer le developpement :
>
> 1. **`adminNotes` visible client ?** (Section B) — Les notes admin des demandes de personnalisation doivent-elles etre visibles au client, renommees en "reponse", ou rester internes ?
> 2. **Annulation en PROCESSING par le client ?** (Section K) — `canCancelOrder()` accepte PENDING et PROCESSING. Le client peut-il annuler une commande en preparation ou seulement en PENDING ?
> 3. **Suppression immediate vs differee ?** (Section M) — `delete-account.ts` anonymise immediatement. Passer par `PENDING_DELETION` avec periode de grace de 30 jours (recommande) ou garder le comportement actuel ?
> 4. ~~**Commandes non-payees visibles ?** (Section F)~~ — **FERMEE** : Les commandes non payees restent masquees. Justification UX dans `fetch-user-orders.ts:47-49` : "Les commandes PENDING/FAILED/CANCELLED sont des artefacts techniques (reservations de stock) et ne doivent pas apparaitre dans Mes commandes." Le hardcode `paymentStatus: PAID` est delibere et correct.


---

## Tableau de suivi

| Feature | Statut | Backend | Effort | Decisions bloquantes | Notes |
|---|---|---|---|---|---|
| Navigation (7 items) | A faire | Complet | Faible | - | Page a recreer, composants modules intacts |
| Compte (dashboard) | A faire | Complet | Faible | - | Page a recreer, composants modules intacts |
| Commandes (liste) | A faire | Complet | Faible | - | Page a recreer, composants modules intacts |
| Mes avis | A faire | Complet | Faible | - | Page a recreer, composants modules intacts |
| A - Adresses | A faire | Complet | Faible | - | Page a recreer, composants modules intacts |
| B - Mes demandes | A faire | Complet | Faible | Decision 1 | Page a recreer, composants modules intacts |
| C - Facture PDF | A faire | Complet | Faible | - | Page a recreer, fix securite `order.userId` applique |
| D - Remboursements | A faire | A completer | Faible | - | Modifier `GET_ORDER_SELECT` + 1 composant |
| E - Newsletter settings | A faire | Complet | Faible | - | Page a recreer, composants modules intacts |
| F - Filtres commandes | A faire | A completer | Faible | ~~Decision 4~~ fermee | Filtres absents du schema (tri seul implemente). `paymentStatus: PAID` est delibere (Decision 4 fermee) |
| G - Sessions actives | A faire | Complet | Faible | - | Page a recreer, composants modules intacts |
| H - Demande de retour | A faire | Complet | Faible | - | Backend complet (`requestReturn` action, schema, validation 14j), composant a creer |
| I - Changement email | A faire | A completer | Moyen | - | Email absent de `ProfileForm`, `changeEmail` non configure dans Better Auth |
| J - Panier wishlist | A faire | Complet | Faible | - | `AddToCartCardButton` deja dans `ProductCard` |
| K - Annulation commande client | A faire | A completer | Moyen | Decision 2 | `cancelOrder` admin-only, mais `canCancelOrder()` reutilisable |
| L - Codes promo sur commande | A faire | A completer | Faible | - | `discountAmount` affiche mais pas le code |
| M - Annulation suppression compte | A faire | A completer | Moyen | Decision 3 | `PENDING_DELETION` non utilise, `deletionRequestedAt` dead code |

> **Note :** La feature H (Demande de retour client) a ete ajoutee pour couvrir l'obligation legale du droit de retractation 14 jours.

---

## Architecture transversale

### Layout espace-client

Le layout utilise un flex 2 colonnes (desktop) :
- **Colonne sidebar (w-56 fixe)** : `AccountNav` (desktop only, `hidden lg:block`, sticky top-28)
- **Colonne contenu (flex-1)** : page content

### Fichiers a creer

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/layout.tsx` | **Existe** - Layout complet (flex 2 colonnes, metadata template `%s | Mon compte | Synclune`, robots noindex). A enrichir si besoin |
| `app/(boutique)/(espace-client)/not-found.tsx` | **A creer** - Page 404 pour entites introuvables (commande, adresse) |

> **Note :** `ROUTES.ACCOUNT` dans `shared/constants/urls.ts` definit `ROOT`, `ORDERS`, `ORDER_DETAIL`, `FAVORITES`, `REVIEWS`, `ADDRESSES`, `CUSTOMIZATIONS`, `SETTINGS`. Les anciennes entrees `PROFILE` et `SECURITY` (dead code) ont ete supprimees.

### Pattern page detail commande (`/commandes/[orderNumber]`)

La page affiche la commande dans une grille 2/3 + 1/3 :
- **Colonne principale (2/3)** : `OrderItemsList` → `OrderRefundsCard` (si refunds) → `OrderStatusTimeline` (timeline de statut) → `OrderTracking` (suivi colis, visible seulement si `trackingNumber`)
- **Colonne sidebar (1/3)** : `OrderSummaryCard` (recapitulatif montants) → `OrderAddressesCard` (adresse de livraison) → `DownloadInvoiceButton` (si `PAID && invoiceStatus === "GENERATED"`) → `RequestReturnButton` (Feature H, si eligible retractation 14j) → `CancelOrderButton` (Feature K, si annulable)

**Data fetcher** : `getOrder({ orderNumber })` dans `modules/orders/data/get-order.ts`. Gere l'authentification et le scope `userId` automatiquement (les non-admins ne voient que leurs propres commandes). Utilise `"use cache: private"` avec `cacheLife("dashboard")` et tags specifiques a l'utilisateur (non-admins : `ORDERS_CACHE_TAGS.USER_ORDERS(userId)`).

### Pattern page parametres (`/parametres`)

La page parametres utilise aussi une grille 2/3 + 1/3 :
- **Colonne principale (2/3)** : `ProfileForm` → `SecuritySection` (change password + providers OAuth) → `GdprSection` (export/delete). Note : `ExportDataButton` (`modules/users/components/export-data-button.tsx`) et `export-user-data.ts` existent deja. Le format d'export (JSON contenant profil, commandes, adresses, avis, preferences newsletter) devrait etre documente
- **Colonne sidebar (1/3)** : `NewsletterSettingsCard` (`modules/newsletter/components/newsletter-settings-card.tsx`) → `ActiveSessionsCard`

> **`SecuritySection` n'existe pas encore** — a creer comme wrapper. Les composants enfants existants sont :
> - `ChangePasswordDialog` (`modules/users/components/change-password-dialog.tsx`) : dialog modal avec `ChangePasswordForm`, min 6 caracteres
> - `ResendVerificationButton` (`modules/users/components/resend-verification-button.tsx`) : bouton avec cooldown 60s, utilise localStorage
>
> `SecuritySection` devra afficher :
> - Un bouton "Modifier mon mot de passe" ouvrant `ChangePasswordDialog` (uniquement si le compte utilise le provider "email" — les comptes OAuth n'ont pas de mot de passe)
> - Un statut de verification email avec `ResendVerificationButton` si `emailVerified === false`
> - Les providers OAuth connectes (Google, GitHub) via le modele `Account` : afficher "Connecte via Google" etc. La gestion de liaison/deliaison de comptes peut etre V2

### Pattern page compte (`/compte`) - Dashboard

Page tableau de bord avec stats et raccourcis (voir section dediee ci-dessous pour les details) :
- Composants existants : `AccountStatsCards`, `AccountStatsCardsSkeleton`
- Data fetcher : `getAccountStats()` → `{ totalOrders, pendingOrders, cartItemsCount }`
- Liens rapides vers les sections principales

### Protection des routes

La protection des routes de l'espace client est assuree par le proxy (`proxy.ts`, convention Next.js 16) :

- Le middleware verifie l'existence du cookie de session via `getSessionCookie()` (Better Auth)
- Les routes `/compte`, `/commandes`, `/adresses`, `/mes-avis`, `/mes-demandes`, `/parametres` sont dans `protectedRoutes`
- Si pas de cookie de session, redirection vers `/connexion?callbackURL={pathname}`
- Le layout `app/(boutique)/(espace-client)/layout.tsx` est purement visuel (pas d'auth guard)
- Les server actions continuent de verifier l'auth cote serveur via `requireAuth()` / `requireAdmin()`

### Metadata / SEO

Chaque page de l'espace client doit exporter ses `metadata` Next.js :

- Titre contextuel : `{ title: "Mes commandes" }`, `{ title: "Parametres" }`, etc.
- Le layout peut definir un template de titre : `{ title: { template: "%s | Mon compte | Synclune", default: "Mon compte | Synclune" } }`
- Toutes les pages doivent avoir `robots: { index: false }` (contenu prive, pas d'indexation)
- Pas de `description` necessaire (pages non indexees)

### Error boundaries

- `app/(boutique)/error.tsx` existe et sera herite par toutes les pages de l'espace client (affiche `ParticleBackground` + message + boutons "Reessayer" / "Retour a l'accueil")
- Recommander un `app/(boutique)/(espace-client)/not-found.tsx` pour les cas commande/adresse introuvable (les pages detail appellent `notFound()` si l'entite n'existe pas)
- **`loading.tsx` recommande** au niveau `(espace-client)/` pour les transitions de navigation (toutes les pages font des fetches caches). Un skeleton global avec le layout 2 colonnes (sidebar vide + zone de contenu avec skeleton) ameliorera l'UX. Les pages avec des besoins specifiques (tableau commandes, grille adresses) peuvent ajouter leur propre `loading.tsx` par-dessus

### Composants partages reutilisables

Composants existants a reutiliser dans les pages de l'espace client :

| Composant | Fichier | Usage |
|---|---|---|
| `PageHeader` (variante `compact`) | `shared/components/page-header.tsx` | En-tete de page simplifie sans breadcrumbs, adapte a l'espace client |
| `Empty` (compound component) | `shared/components/ui/empty.tsx` | Etats vides : `<Empty>`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`, `EmptyActions`. Variantes `default` / `borderless`, tailles `sm` / `default` / `lg` |
| `CursorPagination` | `shared/components/cursor-pagination/cursor-pagination.tsx` | Pagination cursor-based avec boutons prev/next, select per-page, liens SEO `rel="prev/next"`, aria-live. Deja integre dans `CustomerOrdersTable` |
| `RecentOrders` | `modules/orders/components/recent-orders.tsx` | Table des commandes recentes (limit configurable, lien "voir tout"). A integrer dans le dashboard `/compte` |
| `AddressInfoCard` | `modules/addresses/components/address-info-card.tsx` | Carte d'info adresse en lecture seule. Utilisable dans le detail commande |
| `SortDrawer` | `shared/components/sort-drawer/` | Tri sur mobile (drawer bottom). Alternative a `SortSelect` sur petit ecran pour la liste commandes |
| `LogoutAlertDialog` | `modules/auth/components/logout-alert-dialog.tsx` | Dialog de confirmation de deconnexion. Utilise dans `AccountNav` |

---

## Navigation transversale

> **Statut : A faire** — Backend complet, page a recreer

### Fichier existant

`modules/users/components/account-nav.tsx`

### Implementation actuelle

6 entrees dans `navItems` avec `desktopOnly: true` pour Adresses et Mes demandes (filtrees en mobile), plus un bouton de deconnexion (via `LogoutAlertDialog`) separe par un divider en bas de la sidebar desktop :

```ts
import { LayoutDashboard, MapPin, MessageSquare, Package, Settings, Sparkles } from "lucide-react";

const navItems = [
  { href: "/compte", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/commandes", label: "Commandes", icon: Package },
  { href: "/mes-avis", label: "Mes avis", icon: MessageSquare },
  { href: "/adresses", label: "Adresses", icon: MapPin, desktopOnly: true },
  { href: "/mes-demandes", label: "Mes demandes", icon: Sparkles, desktopOnly: true },
  { href: "/parametres", label: "Parametres", icon: Settings },
];
```

### Deconnexion

Le dropdown navbar ne mene plus vers un menu avec deconnexion — il redirige directement vers l'espace client. Le bouton de deconnexion est donc integre dans `AccountNav` :
- **Desktop** : bouton "Se deconnecter" avec icone `LogOut` en bas de la sidebar, separe par un divider. Ouvre `LogoutAlertDialog` (confirmation).
- **Mobile** : le bouton de deconnexion est accessible via la page Parametres (`/parametres`) dans `GdprSection`, ou via le tableau de bord.

### Attention mobile

La bottom bar affiche les 4 items non-`desktopOnly` : **Tableau de bord**, **Commandes**, **Mes avis**, **Parametres**. Les 2 items `desktopOnly` (Adresses, Mes demandes) restent accessibles via la sidebar desktop et le tableau de bord.

---

## Page compte - Dashboard (`/compte`)

> **Statut : A faire** — Backend complet, page a recreer

### Statut actuel

- **Backend** : complet (data fetcher, composants)
- **Composants** : existants (`AccountStatsCards`, `AccountStatsCardsSkeleton`)
- **Page** : supprimee, a recreer

### Donnees disponibles

| Source | Fonction | Return type |
|---|---|---|
| `modules/users/data/get-account-stats.ts` | `getAccountStats()` | `Promise<AccountStats \| null>` |

`AccountStats` contient : `totalOrders: number`, `pendingOrders: number`, `cartItemsCount: number`.

> **Note :** `memberSince` (Date) n'est pas dans `AccountStats`. Il est passe separement a `AccountStatsCards` depuis `user.createdAt` via `getCurrentUser()` (`modules/users/data/get-current-user.ts`).
>
> `GET_CURRENT_USER_DEFAULT_SELECT` (`modules/users/constants/current-user.constants.ts`) selectionne actuellement : `id`, `name`, `email`, `emailVerified`, `role`, `createdAt`, `updatedAt`. Ce select devra etre enrichi avec `accountStatus` et `deletionRequestedAt` pour la Feature M.

> **Note :** `pendingOrders` compte les commandes avec `status: "PROCESSING"` (en preparation), pas `PENDING`. Le nom est trompeur mais conserve pour compatibilite.

Le cache utilise `"use cache: private"`, `cacheLife("userOrders")`, `cacheTag(ORDERS_CACHE_TAGS.ACCOUNT_STATS(userId))`.

### Fichiers

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/compte/page.tsx` | **Existe** - Page basique (profil card avec nom, email, date membre). A enrichir avec `AccountStatsCards`, `RecentOrders`, liens rapides |
| `modules/users/components/account-stats-cards.tsx` | Cartes de stats (utilise `use(statsPromise)`, wrapper en `<Suspense>`) |
| `modules/users/components/account-stats-cards-skeleton.tsx` | Skeleton de chargement |
| `modules/users/data/get-account-stats.ts` | Data fetcher avec cache |

### UI

`AccountStatsCards` affiche actuellement 2 cartes :
- "Membre depuis" (date formatee mois/annee)
- "Commandes passees" (`totalOrders`)

> **Note :** `pendingOrders` et `cartItemsCount` sont fetches mais pas affiches dans le composant. Ils pourraient etre utilises pour enrichir le dashboard (ex: "2 commandes en cours", "3 articles dans le panier").

### Enrichissements possibles

- Commandes recentes via `RecentOrders` (`modules/orders/components/recent-orders.tsx`) : composant existant (table avec colonnes, limite configurable, lien "voir tout" vers `/commandes`). L'integrer dans la page dashboard sous les stats, enveloppe dans `<Suspense>` avec skeleton. Props : `limit={5}` pour afficher les 5 dernieres commandes
- Liens rapides vers les sections principales (commandes, favoris, parametres)
- Bandeau si `accountStatus === "PENDING_DELETION"` (lie a Feature M)

### Empty state

Impossible : le dashboard est toujours accessible pour un utilisateur connecte.

---

## Page commandes - Liste (`/commandes`)

> **Statut : A faire** — Backend complet, page a recreer

### Statut actuel

- **Backend** : complet (data fetcher avec pagination cursor-based, tri)
- **Composants** : existants (`CustomerOrdersTable`, `CustomerOrdersTableSkeleton`, `SortSelect`)
- **Page** : supprimee, a recreer

### Donnees disponibles

| Source | Fonction | Return type |
|---|---|---|
| `modules/orders/data/get-user-orders.ts` | `getUserOrders(params?)` | `Promise<GetUserOrdersReturn>` |
| `modules/orders/data/fetch-user-orders.ts` | `fetchUserOrders(userId, params)` | Fonction interne avec `"use cache: private"` |

`GetUserOrdersReturn` contient : `orders: UserOrder[]`, `pagination: { nextCursor, prevCursor, hasNextPage, hasPreviousPage }`.

### Pagination

Pattern cursor-based existant :
- `cursor` : ID du dernier element
- `direction` : `"forward"` ou `"backward"`
- `perPage` : 10 par defaut, max 50
- `sortBy` : 4 options (voir ci-dessous)
- Le composant `CursorPagination` est integre dans `CustomerOrdersTable`

### Tri

Le tri utilise `SortSelect` (`shared/components/sort-select.tsx`) avec le hook `useSortSelect()` qui lit/ecrit le search param `sort` dans l'URL. Sur mobile, `SortDrawer` (`shared/components/sort-drawer/`) offre une meilleure UX (drawer bottom) et devrait etre utilise a la place du select dropdown.

4 options de tri definies dans `modules/orders/constants/user-orders.constants.ts` :
- "Plus recentes" (defaut), "Plus anciennes", "Montant decroissant", "Montant croissant"

### Fichiers

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/commandes/page.tsx` | **A creer** - Page liste des commandes |
| `modules/orders/components/customer/customer-orders-table.tsx` | Tableau des commandes (server component async, colonnes : numero, date, statut, livraison, articles, total) |
| `modules/orders/components/customer/customer-orders-table-skeleton.tsx` | Skeleton de chargement |
| `shared/components/sort-select.tsx` | Select de tri reutilisable |
| `modules/orders/data/get-user-orders.ts` | Wrapper public (gere session) |
| `modules/orders/data/fetch-user-orders.ts` | Data fetcher interne avec cache |
| `modules/orders/constants/user-orders.constants.ts` | Select, sort options, labels, pagination defaults |
| `modules/orders/schemas/user-orders.schemas.ts` | Schema Zod des params |

> **Note :** `GET_USER_ORDERS_SELECT` inclut deja les champs livraison (`estimatedDelivery`, `actualDelivery`, `shippedAt`, `trackingNumber`, `trackingUrl`, `shippingCarrier`). Le composant `CustomerOrdersTable` peut afficher "Livraison estimee le X" ou "Livree le X" dans la colonne livraison.

> **Note :** `GET_USER_ORDERS_SELECT` ne contient pas `invoiceNumber` (commentaire `ROADMAP` dans le fichier). Si le bouton de telechargement de facture doit apparaitre dans la liste des commandes, ce champ devra etre ajoute au select.

### Empty state

0 commandes : "Vous n'avez pas encore passe de commande." + lien vers `/creations`.

---

## Page detail commande (`/commandes/[orderNumber]`)

> **Statut : A faire** — Backend complet, page a creer

### Statut actuel

- **Backend** : complet (data fetcher avec auth + scope userId, composants d'affichage)
- **Composants** : existants (`OrderItemsList`, `OrderStatusTimeline`, `OrderTracking`, `OrderSummaryCard`, `OrderAddressesCard`, `DownloadInvoiceButton`)
- **Page** : supprimee, a creer
- **Composants a creer** : `OrderRefundsCard` (Feature D), `CancelOrderButton` (Feature K)

### Donnees disponibles

| Source | Fonction | Return type |
|---|---|---|
| `modules/orders/data/get-order.ts` | `getOrder({ orderNumber })` | `Promise<Order \| null>` |

`getOrder()` gere l'authentification et le scope `userId` automatiquement (les non-admins ne voient que leurs propres commandes). Utilise `"use cache: private"` avec `cacheLife("dashboard")` et tags specifiques a l'utilisateur.

> **Note :** `GET_ORDER_SELECT` inclut deja `history` (avec `orderBy: createdAt desc`, `take: 50`) et les 11 valeurs de `OrderAction` (incluant `TRACKING_UPDATED`, `ADDRESS_UPDATED`, `INVOICE_GENERATED`). Le composant `OrderStatusTimeline` peut utiliser cette relation directement au lieu de recalculer les etapes.

### Fichiers

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx` | **A creer** - Page detail commande |
| `modules/orders/data/get-order.ts` | Data fetcher avec auth + cache |
| `modules/orders/constants/order.constants.ts` | `GET_ORDER_SELECT` (a enrichir avec `refunds` et `discountUsages`) |

### Layout et assemblage des composants

La page utilise une grille 2/3 + 1/3 :

**Colonne principale (2/3)** :
1. `OrderItemsList` - Liste des articles commandes
2. `OrderRefundsCard` - Historique remboursements (Feature D, visible seulement si `order.refunds.length > 0`)
3. `OrderStatusTimeline` - Timeline de statut
4. `OrderTracking` - Suivi colis (visible seulement si `order.trackingNumber`)

**Colonne sidebar (1/3)** :
1. `OrderSummaryCard` - Recapitulatif montants + codes promo (Feature L)
2. `OrderAddressesCard` - Adresse de livraison
3. `DownloadInvoiceButton` - Telechargement facture (visible seulement si `order.paymentStatus === "PAID" && order.invoiceStatus === "GENERATED"`)
4. `RequestReturnButton` - Demande de retour (Feature H, visible seulement si eligible au droit de retractation 14 jours)
5. `CancelOrderButton` - Annulation commande (Feature K, visible seulement si `canCancelOrder(order)` et `order.status === "PENDING"`)

### Conditions d'affichage

| Composant | Condition |
|---|---|
| `OrderRefundsCard` | `order.refunds.length > 0` |
| `OrderTracking` | `order.trackingNumber` non null |
| `DownloadInvoiceButton` | `order.paymentStatus === "PAID" && order.invoiceStatus === "GENERATED"` |
| `RequestReturnButton` | `paymentStatus in [PAID, PARTIALLY_REFUNDED]` + `fulfillmentStatus === DELIVERED` + `actualDelivery + 14j > now()` + pas de refund PENDING/APPROVED |
| `CancelOrderButton` | `canCancelOrder(order)` + guard client (`order.status === "PENDING"`) |

### Gestion d'erreur

- Commande introuvable : appeler `notFound()` → affiche `not-found.tsx` de l'espace client
- Commande d'un autre utilisateur : `getOrder()` filtre par `userId` automatiquement → meme comportement que introuvable

### Metadata

```ts
export async function generateMetadata({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  return { title: `Commande ${orderNumber}` }
}
```

---

## Page mes avis (`/mes-avis`)

> **Statut : A faire** — Backend complet, page a recreer

### Statut actuel

- **Backend** : complet (data fetchers, actions CRUD, hooks, schemas)
- **Composants** : existants (`UserReviewCard`, `UserReviewCardActions`, `EditReviewDialog`, `DeleteReviewAlertDialog`, `ReviewableProductCard`, `CreateReviewForm`, `UpdateReviewForm`)
- **Page** : supprimee, a recreer
- **Composant wrapper liste** : inexistant, a creer

### Donnees disponibles

| Source | Fonction | Return type |
|---|---|---|
| `modules/reviews/data/get-user-reviews.ts` | `getUserReviews()` | `Promise<ReviewUser[]>` |
| `modules/reviews/data/get-reviewable-products.ts` | `getReviewableProducts()` | `Promise<ReviewableProduct[]>` |

`getUserReviews()` retourne les avis de l'utilisateur tries par `createdAt desc`, avec cache `"use cache: private"`, `cacheLife("userOrders")`.

`getReviewableProducts()` retourne les produits commandes et livres sans avis existant (dedupliques par produit).

### Fichiers

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/mes-avis/page.tsx` | **A creer** - Page principale |
| `modules/reviews/components/user-review-card.tsx` | Carte d'avis (server component) : image produit, titre, etoiles, date, badge "Achat verifie", statut, contenu, reponse marque |
| `modules/reviews/components/user-review-card-actions.tsx` | Actions (modifier, supprimer) |
| `modules/reviews/components/edit-review-dialog.tsx` | Dialog d'edition (utilise le dialog store) |
| `modules/reviews/components/delete-review-alert-dialog.tsx` | Dialog de suppression (utilise l'alert dialog store) |
| `modules/reviews/components/reviewable-product-card.tsx` | Carte produit evaluable avec bouton "Laisser un avis" ouvrant `CreateReviewForm` |
| `modules/reviews/components/create-review-form.tsx` | Formulaire de creation d'avis |
| `modules/reviews/components/update-review-form.tsx` | Formulaire de modification d'avis |
| `modules/reviews/hooks/use-create-review-form.ts` | Hook pour le formulaire de creation |
| `modules/reviews/hooks/use-update-review-form.ts` | Hook pour le formulaire de modification |
| `modules/reviews/hooks/use-delete-review.ts` | Hook de suppression |

### UI

La page se divise en 2 sections :

1. **Produits a evaluer** (si `reviewableProducts.length > 0`) : grille de `ReviewableProductCard` avec image, titre, date de livraison, et bouton "Laisser un avis"
2. **Mes avis** : liste de `UserReviewCard` avec statut, etoiles, contenu, reponse marque, et actions (modifier/supprimer)

Les dialogs `EditReviewDialog` et `DeleteReviewAlertDialog` sont geres via les stores Zustand (`useDialog` / `useAlertDialog`) et doivent etre montes dans la page.

### Composant wrapper a creer

Un composant wrapper (ex: `UserReviewsList`) pourrait orchestrer :
- La section "Produits a evaluer" en haut
- La liste des avis en dessous
- Les dialogs montes globalement

### Empty state

0 avis et 0 produits evaluables : "Vous n'avez pas encore laisse d'avis."
0 avis mais des produits evaluables : afficher seulement la section "Produits a evaluer".

---

## A - Page adresses (`/adresses`)

> **Statut : A faire** — Backend complet, page a recreer

### Statut actuel

- **Backend** : complet (actions CRUD, data fetcher, schemas, hooks)
- **Composants** : complets (`AddressList`, `AddressCard`, `AddressFormDialog`, `DeleteAddressAlertDialog`, `AddressListSkeleton`, `CreateAddressButton`, `AddressCardActions`)
- **Page** : supprimee, a recreer

### Donnees disponibles

| Source | Fonction | Return type |
|---|---|---|
| `modules/addresses/data/get-user-addresses.ts` | `getUserAddresses()` | `Promise<UserAddress[] \| null>` |
| `modules/addresses/data/search-address.ts` | `searchAddress(params)` | `Promise<SearchAddressReturn>` |

### Fichiers

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/adresses/page.tsx` | **A creer** - Page principale |
| `modules/addresses/components/address-list.tsx` | Grille + empty state |
| `modules/addresses/components/address-card.tsx` | Carte individuelle |
| `modules/addresses/components/address-card-actions.tsx` | Dropdown (modifier, supprimer, defaut) |
| `modules/addresses/components/address-form-dialog.tsx` | Formulaire TanStack Form + autocomplete BAN |
| `modules/addresses/components/create-address-button.tsx` | Bouton ouvrant le dialog |
| `modules/addresses/components/delete-address-alert-dialog.tsx` | Confirmation suppression |
| `modules/addresses/hooks/use-create-address.ts` | Hook creation |
| `modules/addresses/hooks/use-update-address.ts` | Hook modification |
| `modules/addresses/hooks/use-delete-address.ts` | Hook suppression |
| `modules/addresses/hooks/use-set-default-address.ts` | Hook defaut |

### Empty state

0 adresses : message + bouton "Ajouter une adresse" ouvrant le dialog.

---

## B - Suivi des demandes de personnalisation (`/mes-demandes`)

> **Statut : A faire** — Backend complet, page a recreer

### Statut actuel

- **Schema** : `CustomizationRequest` avec `userId`, `status`, `adminNotes`, `respondedAt`, index `@@index([userId, status])`
- **Backend admin** : complet (listing, detail, actions update status/notes)
- **Frontend client** : composants existants, page a recreer

### Prisma - Champs utiles cote client

```prisma
model CustomizationRequest {
  id              String   @id @default(cuid())
  userId          String?
  firstName       String
  email           String
  phone           String?
  productTypeLabel String  // Snapshot du type selectionne
  details         String   // Description de la demande
  status          CustomizationRequestStatus // PENDING | IN_PROGRESS | COMPLETED | CANCELLED
  adminNotes      String?  // Reponse/notes admin (visible client? a decider)
  respondedAt     DateTime? // Date premiere reponse
  createdAt       DateTime
  inspirationProducts Product[] // M2M
}
```

### Fichiers

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/mes-demandes/page.tsx` | **A creer** - Page listant les demandes |
| `modules/customizations/data/get-user-customization-requests.ts` | Data fetcher filtre par `userId` |
| `modules/customizations/components/customer/customization-request-list.tsx` | Liste des demandes |
| `modules/customizations/components/customer/customization-request-card.tsx` | Carte individuelle |

### Constants reutilisees

- `modules/customizations/constants/status.constants.ts` : `CUSTOMIZATION_STATUS_LABELS`, `CUSTOMIZATION_STATUS_COLORS`

### Decision ouverte

`adminNotes` est prevu comme "notes internes admin". Faut-il :
1. Le rendre visible au client (renommer en "reponse") ?
2. Ajouter un champ `clientResponse` separe ?
3. Le garder interne et ne montrer que le statut ?

### Empty state

0 demandes : message + lien vers `/personnalisation` pour creer une demande.

---

## C - Facture PDF

> **Statut : A faire** — Backend complet, page a recreer

### Implementation actuelle

- `DownloadInvoiceButton` dans la page detail commande
- Route API pour la generation du PDF
- Route API : `app/api/orders/[orderNumber]/invoice/route.ts` (GET handler avec auth, verification userId, generation numero de facture sequentiel, cache-control private)
- Condition : affiche uniquement si `order.paymentStatus === "PAID" && order.invoiceStatus === "GENERATED"` (evite d'afficher le bouton avant generation de la facture ou si elle est annulee VOIDED)

### Fix securite applique

La route API de telechargement de facture verifie maintenant `order.userId === session.user.id` pour empecher un utilisateur de telecharger la facture d'un autre utilisateur.

### Donnees utilisees (via `GET_ORDER_SELECT`)

- `orderNumber`, `createdAt`, `paidAt`
- `customerName`, `customerEmail`
- `shippingFirstName`, `shippingLastName`, etc. (adresse)
- `items[]` avec `productTitle`, `price`, `quantity`
- `subtotal`, `discountAmount`, `shippingCost`, `taxAmount`, `total`
- `currency`

### Informations legales incluses (micro-entreprise)

- Numero de commande comme reference facture
- Mention "TVA non applicable, art. 293 B du CGI"
- Coordonnees de l'entreprise
- Date de facturation = date de paiement (`paidAt`)

### Details manquants a specifier

- **Format exact du PDF** : logo, footer, mise en page, couleurs de marque
- **Strategie de cache** : generer a chaque telechargement ou stocker le PDF genere (ex: dans UploadThing ou S3) et servir le cache ? Un cache evite la regeneration mais complexifie l'invalidation si les donnees changent
- **Gestion d'erreur** : si la generation du PDF echoue, afficher un toast d'erreur avec option de retry

---

## D - Historique des remboursements

> **Statut : A faire** — Backend a completer

### Statut actuel

- **Schema** : `Refund` et `RefundItem` existent avec toutes les relations
- **Backend admin** : actions de creation/gestion de remboursements implementees
- **Data admin** : `modules/orders/data/get-order-refunds.ts` existe mais est reserve a l'admin (`requireAdmin()`). Deux approches possibles : (1) enrichir `GET_ORDER_SELECT` avec les refunds inline (recommande, evite un fetch supplementaire), ou (2) creer un data fetcher client dedie
- **Frontend client** : rien (`GET_ORDER_SELECT` n'inclut pas `refunds`)

### Prisma - Champs utiles

```prisma
model Refund {
  id             String       @id
  orderId        String
  stripeRefundId String?
  amount         Int          // Montant en centimes
  currency       String
  reason         RefundReason // CUSTOMER_REQUEST | DEFECTIVE | WRONG_ITEM | LOST_IN_TRANSIT | FRAUD | OTHER
  status         RefundStatus // PENDING | APPROVED | COMPLETED | REJECTED | FAILED | CANCELLED
  failureReason  String?
  note           String?
  items          RefundItem[]
  processedAt    DateTime?
  createdAt      DateTime
}

model RefundItem {
  id          String    @id
  refundId    String
  orderItemId String
  orderItem   OrderItem // Relation vers l'article d'origine
  quantity    Int
  amount      Int       // Montant rembourse pour cet article
  restock     Boolean
}
```

### Fichiers a modifier

| Fichier | Modification |
|---|---|
| `modules/orders/constants/order.constants.ts` | Ajouter `refunds` au `GET_ORDER_SELECT` |

> **Note :** `GET_ORDER_SELECT` (dans `order.constants.ts`) est le select de detail commande. Ne pas confondre avec `GET_USER_ORDERS_SELECT` (dans `user-orders.constants.ts`) qui est le select de la liste des commandes et n'a pas besoin des refunds.

### Select a ajouter dans `GET_ORDER_SELECT`

```ts
refunds: {
  where: { deletedAt: null },
  select: {
    id: true,
    amount: true,
    currency: true,
    reason: true,
    status: true,
    note: true,
    processedAt: true,
    createdAt: true,
    items: {
      select: {
        id: true,
        quantity: true,
        amount: true,
        orderItem: {
          select: {
            productTitle: true,
            skuColor: true,
          },
        },
      },
    },
  },
  orderBy: { createdAt: "desc" as const },
},
```

### Fichier a creer

| Fichier | Role |
|---|---|
| `modules/orders/components/customer/order-refunds-card.tsx` | Carte listant les remboursements |

### UI

La carte s'affiche dans la colonne principale (2/3), apres `OrderItemsList` et avant `OrderTracking`. Elle n'apparait que si `order.refunds.length > 0`.

Chaque remboursement affiche :
- Badge de statut (`RefundStatus`) avec couleurs
- Montant rembourse (formater en euros)
- Raison (labels francais a creer dans une constante)
- Date de creation / date de traitement
- Liste des articles concernes avec quantites

### Attention : `REFUND_STATUS_COLORS` sont des hex strings

Les couleurs dans `modules/refunds/constants/refund.constants.ts` sont des hex strings (`#f59e0b`, `#3b82f6`, `#22c55e`, `#ef4444`, `#dc2626`, `#6b7280`), pas des noms Tailwind. L'utilisation cote client doit passer par `style={{ color }}` ou un mapping vers des classes Tailwind.

### Remboursements partiels

Un remboursement peut ne couvrir qu'une partie des articles ou un montant partiel. L'UI doit :
- Afficher le montant rembourse vs le total de la commande (ex: "12,50 EUR rembourses sur 45,00 EUR")
- Lister uniquement les articles concernes par le remboursement (via `RefundItem`)
- Si plusieurs remboursements existent sur une meme commande, les afficher en liste chronologique
- Afficher un total cumule des remboursements en haut de la carte

### Constants existantes a reutiliser

Les labels sont deja definis dans `modules/refunds/constants/refund.constants.ts` :

- `REFUND_REASON_LABELS` : "Retractation client", "Produit defectueux", "Erreur de preparation", "Colis perdu", "Fraude", "Autre"
- `REFUND_STATUS_LABELS` : "En attente", "Approuve", "Rembourse", "Refuse", "Echoue", "Annule"
- `REFUND_STATUS_COLORS` : hex strings par statut (voir ci-dessus)

Ne pas creer de doublons dans `modules/orders/`.

### Gestion d'erreur

Pas d'erreur specifique attendue (lecture seule). Si le fetch echoue, la carte ne s'affiche pas (graceful degradation).

### Empty state

Pas d'empty state necessaire : la carte ne s'affiche que si `refunds.length > 0`.

---

## E - Gestion newsletter dans les parametres

> **Statut : A faire** — Backend complet, page a recreer

### Statut actuel

- **Backend** : complet (data fetcher, action toggle, composant)
- **Composant** : existant (`NewsletterSettingsCard`)
- **Page** : integree dans la page parametres (sidebar)

### Donnees disponibles

| Source | Fonction | Return type |
|---|---|---|
| `modules/newsletter/data/get-subscription-status.ts` | `getSubscriptionStatus()` | `Promise<{ isSubscribed: boolean, email: string \| null, isConfirmed: boolean }>` |

### Fichiers

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/parametres/page.tsx` | **A creer** - Page parametres (inclut `NewsletterSettingsCard` dans la sidebar) |
| `modules/newsletter/components/newsletter-settings-card.tsx` | Carte avec statut (dot vert/gris) + bouton subscribe/unsubscribe |
| `modules/newsletter/data/get-subscription-status.ts` | Data fetcher avec cache |

### UI

`NewsletterSettingsCard` est un client component qui :
- Affiche le statut d'inscription (dot vert = inscrit, gris = non inscrit)
- Propose un bouton pour s'inscrire ou se desinscrire
- Appelle l'action `toggleNewsletter`

---

## F - Filtrage/recherche des commandes

> **Statut : A faire** — Backend a completer (tri implemente, filtres non)

### Statut actuel

- **Schema actuel** : `user-orders.schemas.ts` ne contient que `cursor`, `direction`, `perPage`, `sortBy` - aucun champ de filtre n'est defini
- **Tri** : implemente via `SortSelect` avec 4 options
- **Backend** : `fetch-user-orders.ts` hardcode `paymentStatus: PaymentStatus.PAID` sans filtres supplementaires
- **UI filtres** : absente

### `paymentStatus: PAID` hardcode (Decision 4 — fermee)

`fetch-user-orders.ts:47-52` hardcode `paymentStatus: PaymentStatus.PAID` de maniere deliberee. Les commandes non payees (PENDING, FAILED, EXPIRED) sont des artefacts techniques (reservations de stock) et ne doivent pas apparaitre dans "Mes commandes". Les filtres client operent donc uniquement sur les commandes deja payees. Les params `filter_status` et `filter_fulfillmentStatus` existent deja dans le composant admin `orders-filter-sheet.tsx` mais ne sont pas wires cote client.

### Fichiers a modifier

| Fichier | Modification |
|---|---|
| `app/(boutique)/(espace-client)/commandes/page.tsx` | **A creer** - Ajouter parsing des filtres + passer a `getUserOrders` |
| `modules/orders/schemas/user-orders.schemas.ts` | Ajouter champs `search`, `filterStatus`, `filterFulfillmentStatus` |
| `modules/orders/data/get-user-orders.ts` | Passer les filtres a `fetchUserOrders` |
| `modules/orders/data/fetch-user-orders.ts` | Ajouter les `where` clauses |

### Fichier a creer

| Fichier | Role |
|---|---|
| `modules/orders/components/customer/customer-orders-filters.tsx` | Barre de filtres (statut + recherche) |

### UI des filtres

Barre de filtres au-dessus de la table, contenant :
- Input recherche par numero de commande (`Order.orderNumber`)
- Select filtre par statut (`OrderStatus` : PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
- Select filtre par statut livraison (`FulfillmentStatus` : UNFULFILLED, PROCESSING, SHIPPED, DELIVERED, RETURNED)

Les filtres utilisent des search params URL (pattern existant dans le projet).

### Filtre par date (optionnel, V2)

Pour les clients avec beaucoup de commandes, un filtre par plage de dates serait utile. Options :
- Presets : "30 derniers jours", "3 derniers mois", "6 derniers mois", "Cette annee"
- Ou un date range picker (plus complexe a implementer)

A evaluer selon le volume moyen de commandes par client.

### Schema enrichi

```ts
// modules/orders/schemas/user-orders.schemas.ts
export const getUserOrdersSchema = z.object({
  cursor: cursorSchema,
  direction: directionSchema,
  perPage: createPerPageSchema(...),
  sortBy: userOrdersSortBySchema,
  // NEW
  search: z.string().max(50).optional(),
  filterStatus: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  filterFulfillmentStatus: z.enum(["UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED", "RETURNED"]).optional(),
});
```

### Where clause dans fetch-user-orders.ts

```ts
const where: Prisma.OrderWhereInput = {
  userId,
  deletedAt: null,
  ...(params.search && {
    orderNumber: { contains: params.search, mode: "insensitive" },
  }),
  ...(params.filterStatus && { status: params.filterStatus }),
  ...(params.filterFulfillmentStatus && { fulfillmentStatus: params.filterFulfillmentStatus }),
};
```

### Empty state filtre

Si les filtres ne retournent aucun resultat : "Aucune commande ne correspond a vos criteres" + bouton "Reinitialiser les filtres".

---

## G - Sessions actives

> **Statut : A faire** — Backend complet, page a recreer

### Implementation actuelle

- `ActiveSessionsCard` dans `modules/auth/components/active-sessions-card.tsx` (contient `RevokeSessionButton` inline)
- `revokeSession` server action dans `modules/auth/actions/revoke-session.ts`
- Listing des sessions non expirees
- Bouton "Revoquer" par session

### Identification de la session actuelle

La session actuelle est identifiee en comparant `session.token` (du cookie Better Auth) avec le `token` de chaque session en base. La session en cours affiche un badge "Session actuelle" et le bouton "Revoquer" est masque.

### UI

Chaque session affiche :
- Icone appareil (parser `userAgent` : desktop/mobile/tablet)
- Navigateur + OS (parser `userAgent`)
- Adresse IP (affichee telle quelle actuellement — masquage partiel a implementer si souhaite)
- Date de connexion
- Badge "Session actuelle" pour la session en cours
- Bouton "Revoquer" (sauf session actuelle)

### Gestion d'erreur

Si la revocation echoue (ex: session deja expiree) : toast d'erreur + refresh de la liste pour synchroniser l'etat.

---

## H - Demande de retour client (droit de retractation 14 jours)

> **Statut : A faire** — Backend complet, composant a creer
>
> **Obligation legale** : directive 2011/83/EU, art. L221-18 Code de la consommation. Les consommateurs francais disposent d'un droit de retractation de 14 jours a compter de la reception du produit.

### Statut actuel

- **Backend** : complet (`requestReturn` server action avec auth, rate limiting, validation IDOR, verification delai 14 jours, creation `Refund` PENDING)
- **Schema** : `requestReturnSchema` dans `modules/refunds/schemas/refund.schemas.ts`
- **Frontend client** : aucun composant dedie. Le bouton de demande de retour doit etre ajoute a la page detail commande

### Implementation backend existante

L'action `requestReturn` (`modules/refunds/actions/request-return.ts`) :
1. Verifie l'authentification (`requireAuth`)
2. Applique un rate limit (`RETURN_REQUEST_LIMIT`)
3. Valide l'input (`requestReturnSchema` : `orderId`, `reason`, `message` optionnel)
4. Verifie la propriete de la commande (protection IDOR)
5. Verifie l'eligibilite : `paymentStatus === PAID || PARTIALLY_REFUNDED` et `fulfillmentStatus === DELIVERED`
6. Verifie le delai de 14 jours depuis `actualDelivery`
7. Verifie qu'aucun remboursement PENDING ou APPROVED n'existe deja
8. Calcule le montant refundable en deduisant les articles deja rembourses
9. Cree un `Refund` avec statut `PENDING` pour review admin
10. Invalide les caches pertinents

### Schema de validation client

```ts
// modules/refunds/schemas/refund.schemas.ts
export const requestReturnSchema = z.object({
  orderId: z.cuid2(),
  reason: z.enum([
    RefundReason.CUSTOMER_REQUEST,  // Retractation client
    RefundReason.DEFECTIVE,          // Produit defectueux
    RefundReason.WRONG_ITEM,         // Erreur de preparation
  ]),
  message: z.string().max(500).optional(),
})
```

> **Note :** Les raisons client sont limitees a 3 valeurs (pas LOST_IN_TRANSIT, FRAUD, OTHER qui sont reservees a l'admin).

### Conditions d'affichage du bouton

Le bouton "Demander un retour" s'affiche dans la page detail commande si **toutes** ces conditions sont remplies :

| Condition | Champ | Valeur |
|---|---|---|
| Commande payee | `order.paymentStatus` | `PAID` ou `PARTIALLY_REFUNDED` |
| Commande livree | `order.fulfillmentStatus` | `DELIVERED` |
| Dans le delai de 14 jours | `order.actualDelivery` | `actualDelivery + 14j > now()` |
| Pas de retour deja en cours | `order.refunds` | Aucun refund avec statut `PENDING` ou `APPROVED` |

### Fichiers a creer

| Fichier | Role |
|---|---|
| `modules/refunds/components/customer/request-return-button.tsx` | Bouton + dialog formulaire de demande de retour |

### Fichier a modifier

| Fichier | Modification |
|---|---|
| `app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx` | Ajouter `<RequestReturnButton>` conditionnel dans la sidebar |
| `modules/orders/constants/order.constants.ts` | Ajouter `refunds` au `GET_ORDER_SELECT` (necessaire aussi pour Feature D) |

### UI

Le bouton s'affiche dans la colonne sidebar (1/3), apres `DownloadInvoiceButton` et avant `CancelOrderButton`. Au clic, il ouvre un dialog contenant :

1. **Select `reason`** : "Retractation (changement d'avis)", "Produit defectueux", "Erreur de preparation"
2. **Textarea `message`** (optionnel) : "Precisions sur votre demande (facultatif)" — max 500 caracteres
3. **Bouton de soumission** : "Envoyer ma demande de retour"
4. **Message de confirmation** : "Votre demande de retour a ete enregistree. Nous la traiterons dans les plus brefs delais."

### Affichage du statut de la demande dans le detail commande

Si la commande a un refund lie (PENDING, APPROVED, COMPLETED, REJECTED) :
- Afficher un bandeau informatif dans la colonne principale : "Demande de retour en cours" / "Retour approuve" / "Retour rembourse" / "Retour refuse"
- Le statut utilise les constants existantes : `REFUND_STATUS_LABELS` et `REFUND_STATUS_COLORS` dans `modules/refunds/constants/refund.constants.ts`

### Jours restants

Afficher le nombre de jours restants pour exercer le droit de retractation : "Il vous reste X jours pour demander un retour." Calcul : `14 - Math.floor((now() - actualDelivery) / (24*60*60*1000))`.

### Gestion d'erreur

| Scenario | Comportement |
|---|---|
| Delai depasse (race condition) | Message "Le delai de retractation de 14 jours est depasse" |
| Retour deja en cours | Message "Une demande de retour est deja en cours pour cette commande" |
| Rate limit | Message "Trop de tentatives, reessayez plus tard" |
| Erreur serveur | Toast generique avec retry |

### Empty state

Pas d'empty state : le bouton n'apparait que si les conditions sont remplies.

---

## I - Modification d'email

> **Statut : A faire** — Backend a completer

### Statut actuel

- **ProfileForm** : le champ email est present en lecture seule (`<Input disabled>` avec message "L'adresse email ne peut pas etre modifiee"). Seul le champ `name` est editable et soumis.
- **Better Auth** : supporte `changeEmail` via son API (`auth.api.changeEmail`)
- **Schema** : `User.email` + `User.emailVerified`

### Approche

> **⚠ `auth.api.changeEmail` n'est PAS integre dans la config Better Auth actuelle.** Les plugins configures dans `modules/auth/lib/auth.ts` sont : `stripe()`, `customSession()`, `nextCookies()`. Il n'y a pas de plugin `changeEmail`. Il faudra soit ajouter le plugin correspondant, soit implementer le flow manuellement (token de verification + email + mise a jour).

Better Auth a un flow `changeEmail` integre qui :
1. Envoie un email de verification a la nouvelle adresse
2. Met a jour l'email apres verification

### Fichiers a creer

| Fichier | Role |
|---|---|
| `modules/users/components/change-email-form.tsx` | Formulaire de changement d'email |
| `modules/users/actions/change-email.ts` | Server action wrapping Better Auth |

### Fichier a modifier

`modules/users/components/profile-form.tsx` : remplacer l'input email disabled par un lien "Modifier mon email" qui ouvre le formulaire.

### Flow

1. L'utilisateur clique "Modifier mon email"
2. Un formulaire demande la nouvelle adresse email
3. L'action serveur appelle `auth.api.changeEmail({ newEmail, ... })`
4. Better Auth envoie un email de verification a la nouvelle adresse
5. Apres confirmation, l'email est mis a jour et `emailVerified` repasse a `true`

### Impacts sur les autres systemes

- **Stripe** : le plugin `@better-auth/stripe` synchronise automatiquement l'email du customer Stripe lors de certains evenements. Verifier si le changement d'email declenche cette sync. Si non, ajouter manuellement `stripe.customers.update(stripeCustomerId, { email: newEmail })` dans l'action de changement d'email.
- **Newsletter** : si l'utilisateur est inscrit a la newsletter (`NewsletterSubscriber.email`), l'email de la souscription doit aussi etre mis a jour. Sinon la newsletter continuera d'arriver sur l'ancienne adresse, et le lien de desinscription ne marchera plus.
- **Sessions** : Better Auth devrait gerer les sessions existantes (les garder valides apres changement d'email).

### Attention

- Verifier que Better Auth supporte `changeEmail` dans la version utilisee
- Si non supporte, implementer manuellement :
  1. Creer un token de verification
  2. Envoyer un email a la nouvelle adresse
  3. Sur confirmation, mettre a jour `User.email` et `emailVerified`
  4. Mettre a jour l'email dans Stripe (`stripeCustomerId`)
  5. Mettre a jour `NewsletterSubscriber.email` si inscrit

---

## J - Ajouter au panier depuis la wishlist

> **Statut : A faire** — Backend complet (`AddToCartCardButton` deja dans `ProductCard`)

### Statut actuel

- **Wishlist** : affiche des `ProductCard` dans une grille
- **ProductCard** : inclut deja `AddToCartCardButton` (`modules/cart/components/add-to-cart-card-button.tsx`)
  - Desktop : overlay au hover sur la carte produit
  - Mobile : bouton pleine largeur sous la carte
  - Gere les produits multi-SKU (selecteur de variante)
- **addToCart** : action existante qui attend `{ skuId, quantity }` via FormData
- **Wishlist data** : inclut les SKUs avec `id`, `inventory`, `isActive`, `priceInclTax`
- **Badge counts** : le store `useBadgeCountsStore` n'est utilise que dans la navbar storefront, pas dans la nav espace-client

### Implementation

Le bouton est deja present dans `ProductCard` qui est utilise par la wishlist. Il suffit de verifier que le composant fonctionne correctement dans le contexte wishlist lors de la recreation de la page.

### Fichiers

| Fichier | Role |
|---|---|
| `app/(boutique)/favoris/page.tsx` | **Existe** - Page favoris (+ error.tsx, loading.tsx), hors espace-client |
| `modules/products/components/product-card.tsx` | Carte produit (inclut `AddToCartCardButton`) |
| `modules/cart/components/add-to-cart-card-button.tsx` | Bouton ajout panier (existant) |

### Donnees disponibles

| Source | Fonction | Return type |
|---|---|---|
| `modules/wishlist/data/get-wishlist.ts` | `getWishlist(params)` | `Promise<{ items, pagination, totalCount }>` |

`getWishlist()` supporte les utilisateurs connectes et les visiteurs invites (via cookie de session). Pagination cursor-based avec `buildCursorPagination` / `processCursorResults`. Retourne `{ items, pagination: { nextCursor, prevCursor, hasNextPage, hasPreviousPage }, totalCount }`. Utilise `"use cache: private"`.

Le `GET_WISHLIST_SELECT` inclut deja tout ce qu'il faut :
```ts
product.skus[]: { id, sku, priceInclTax, inventory, isActive, isDefault, color, material, size, images }
```

---

## K - Annulation de commande par le client

> **Statut : A faire** — Backend a completer (nouvelle action client)

### Contexte

Le schema supporte `OrderStatus.CANCELLED`, `OrderAction.CANCELLED`, et `OrderHistory` pour tracer les changements de statut. L'action `cancelOrder` existante (`modules/orders/actions/cancel-order.ts`) appelle `requireAdminWithUser()` et est donc inaccessible aux clients.

### Elements backend existants reutilisables

- **`canCancelOrder(order)`** dans `modules/orders/services/order-status-validation.service.ts` : verifie si une commande peut etre annulee (exclut SHIPPED, DELIVERED, CANCELLED). Reutilisable pour la version client.
- **`getOrderPermissions(order)`** dans le meme fichier : matrice complete de permissions (`canCancel`, `canRefund`, `canMarkAsShipped`, etc.). Utile pour controler l'affichage des boutons d'action.
- **Restauration stock conditionnelle** : `cancelOrder` (admin) restaure le stock seulement si `paymentStatus === PENDING` (commande non encore payee). Pour les commandes payees, le stock n'est pas restaure car le remboursement Stripe doit etre traite separement.
- **Email d'annulation** : `sendCancelOrderConfirmationEmail` dans `modules/emails/services/status-emails.ts` envoie un email de confirmation d'annulation.

### Prisma - Champs utiles

```prisma
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

enum OrderAction {
  CREATED            // Creation de la commande
  PAID               // Paiement recu
  PROCESSING         // Mise en preparation
  SHIPPED            // Expedition
  DELIVERED          // Livraison confirmee
  CANCELLED          // Annulation
  RETURNED           // Retour client
  STATUS_REVERTED    // Retour a un statut precedent
  TRACKING_UPDATED   // Mise a jour du suivi
  ADDRESS_UPDATED    // Mise a jour de l'adresse de livraison
  INVOICE_GENERATED  // Facture generee
}

enum HistorySource {
  ADMIN
  WEBHOOK
  SYSTEM
  CUSTOMER
}

model OrderHistory {
  id      String  @id @default(cuid())
  orderId String?                           // Nullable (preservation audit)
  order   Order?  @relation(onDelete: SetNull)

  action OrderAction

  previousStatus            OrderStatus?
  newStatus                 OrderStatus?
  previousPaymentStatus     PaymentStatus?
  newPaymentStatus          PaymentStatus?
  previousFulfillmentStatus FulfillmentStatus?
  newFulfillmentStatus      FulfillmentStatus?

  note     String? @db.Text
  metadata Json?

  authorId   String?
  authorName String? @db.VarChar(100)

  source HistorySource @default(ADMIN)

  createdAt DateTime @default(now())
}
```

> **Note** : L'utilitaire `createOrderAuditTx()` (`modules/orders/utils/order-audit.ts`) encapsule la creation d'entrees `OrderHistory` et doit etre utilise dans les transactions.

### Regles metier

Le client ne peut annuler sa commande que si :
- `order.status === "PENDING"` (pas encore en preparation)
- `order.userId === session.user.id` (sa propre commande)

Une commande en `PROCESSING`, `SHIPPED`, ou `DELIVERED` ne peut pas etre annulee par le client (il devrait faire une demande de remboursement via le support).

> **Attention : `canCancelOrder()` accepte aussi PROCESSING.** La fonction `canCancelOrder()` dans `order-status-validation.service.ts` retourne `true` pour PENDING **et** PROCESSING (elle n'exclut que SHIPPED, DELIVERED, CANCELLED). L'action client `cancelOrderCustomer` doit donc ajouter un guard supplementaire `order.status === "PENDING"` en plus de l'appel a `canCancelOrder()`, ou bien la decision peut etre prise d'autoriser l'annulation en PROCESSING aussi (a trancher).

### Fichiers a creer

| Fichier | Role |
|---|---|
| `modules/orders/actions/cancel-order-customer.ts` | Server action client (avec `requireAuth`) |
| `modules/orders/components/customer/cancel-order-button.tsx` | Bouton avec dialog de confirmation |

### Fichier a modifier

| Fichier | Modification |
|---|---|
| `app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx` | **A creer** - Ajouter `<CancelOrderButton>` conditionnel |

### Server action

```ts
// modules/orders/actions/cancel-order-customer.ts
"use server"

import { createOrderAuditTx } from "@/modules/orders/utils/order-audit"
import { canCancelOrder } from "@/modules/orders/services/order-status-validation.service"

export async function cancelOrderCustomer(
  _: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth()
  if ("error" in user) return user.error

  const validation = validateInput(schema, { orderNumber: formData.get("orderNumber") })
  if (!validation.success) return error(validation.error.errors[0]?.message)

  // Verifier que la commande appartient au user ET est annulable
  const order = await prisma.order.findFirst({
    where: {
      orderNumber: validation.data.orderNumber,
      userId: user.id,
      deletedAt: null,
    },
    select: { id: true, orderNumber: true, status: true, paymentStatus: true },
  })
  if (!order) return notFound("Commande introuvable")
  if (!canCancelOrder(order)) return error("Cette commande ne peut plus etre annulee")

  // Guard supplementaire : le client ne peut annuler que les commandes PENDING
  // (canCancelOrder accepte aussi PROCESSING, reserve a l'admin)
  if (order.status !== "PENDING") return error("Cette commande ne peut plus etre annulee")

  // Restauration stock conditionnelle (PENDING seulement)
  const shouldRestoreStock = order.paymentStatus === "PENDING"

  // Si la commande etait payee, marquer le paiement comme rembourse
  const newPaymentStatus = order.paymentStatus === "PAID" ? "REFUNDED" : order.paymentStatus

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", paymentStatus: newPaymentStatus },
    })

    if (shouldRestoreStock) {
      // Restore stock for each SKU
    }

    await createOrderAuditTx(tx, {
      orderId: order.id,
      action: "CANCELLED",
      previousStatus: order.status,
      newStatus: "CANCELLED",
      previousPaymentStatus: order.paymentStatus,
      newPaymentStatus,
      note: "Annulation par le client",
      authorId: user.id,
      authorName: user.name || "Client",
      source: "CUSTOMER",
    })
  })

  // Send cancellation email
  // await sendCancelOrderConfirmationEmail(...)

  updateTag("orders-list")
  updateTag(`order-${order.orderNumber}`)
  return success("Commande annulee")
}
```

### UI

- Le bouton "Annuler la commande" s'affiche uniquement si `canCancelOrder(order)` retourne `true`
- Un `AlertDialog` de confirmation demande "Etes-vous sur de vouloir annuler cette commande ? Cette action est irreversible."
- Apres annulation, la page se rafraichit et le statut passe a `CANCELLED`

### Gestion d'erreur

- Commande pas trouvee ou plus annulable (race condition) : message "Cette commande ne peut plus etre annulee"
- Erreur serveur : toast generique avec retry

---

## L - Codes promo affiches sur commande

> **Statut : A faire** — Backend a completer (nouvelle feature)

### Contexte

Le `discountAmount` (montant de la reduction) est deja affiche dans `OrderSummaryCard` en vert. Mais le **code promo utilise** n'est pas recupere ni affiche.

### Prisma - Champs utiles

```prisma
model DiscountUsage {
  id            String   @id @default(cuid())
  orderId       String
  discountId    String
  discountCode  String   @db.VarChar(30) // Le code tape par le client
  amountApplied Int      // Montant en centimes
  createdAt     DateTime @default(now())
}
```

### Fichiers a modifier

| Fichier | Modification |
|---|---|
| `modules/orders/constants/order.constants.ts` | Ajouter `discountUsages` au `GET_ORDER_SELECT` |
| `modules/orders/components/customer/order-summary-card.tsx` | Afficher le code promo a cote du montant de reduction |

### Select a ajouter dans `GET_ORDER_SELECT`

```ts
discountUsages: {
  select: {
    discountCode: true,
    amountApplied: true,
  },
},
```

### UI

Dans `OrderSummaryCard`, a cote de la ligne "Reduction" existante, ajouter le code promo :
- Avant : `Reduction -12,50 EUR`
- Apres : `Reduction (PROMO20) -12,50 EUR`

Si plusieurs codes appliques (rare mais possible), les lister : `Reduction (PROMO20, BIENVENUE) -12,50 EUR`

### Effort

Tres faible : ajouter 1 champ au select + modifier 1 ligne dans le composant existant.

---

## M - Annulation de demande de suppression de compte

> **Statut : A faire** — Backend a completer (nouvelle feature)

### Contexte

Le schema Prisma prevoit un flux de suppression en 2 etapes :
- `User.accountStatus` : `ACTIVE` | `INACTIVE` | `PENDING_DELETION` | `ANONYMIZED`
- `User.deletionRequestedAt` : date de la demande

Mais l'implementation actuelle (`modules/users/actions/delete-account.ts`) **bypass completement** l'etat `PENDING_DELETION` et anonymise immediatement le compte en une transaction. Il n'y a pas de periode de grace.

### Dead code pret a activer

- `deletionRequestedAt` n'est jamais set nulle part dans le code actuel (uniquement reference dans `prisma/schema.prisma` et `modules/cron/services/process-account-deletions.service.ts`)
- Le cron `process-account-deletions` et son service sont **complets et testes** mais n'ont rien a traiter car aucun compte n'est jamais mis en `PENDING_DELETION`
- `account-status.constants.ts` fournit deja labels, couleurs et descriptions pour les 4 statuts :
  - `ACCOUNT_STATUS_LABELS` : "Actif", "Inactif", "Suppression en attente", "Anonymise"
  - `ACCOUNT_STATUS_COLORS` : green, yellow, orange, gray
  - `ACCOUNT_STATUS_DESCRIPTIONS` : textes descriptifs pour tooltips

> **Inconsistance d'anonymisation** : Les deux chemins de suppression utilisent `generateAnonymizedEmail()` (`modules/users/utils/anonymization.utils.ts`) pour l'email (format identique : `anonymized-${userId}@deleted.synclune.local`). Les differences sont :
>
> | Champ | `delete-account.ts` (immediat) | `process-account-deletions.service.ts` (cron) |
> |---|---|---|
> | Nom utilisateur | `"Compte supprime"` | `"Utilisateur supprime"` |
> | Noms livraison | `"Anonyme"` | `"X"` |
>
> Les autres champs sont identiques : `customerName: "Client supprime"`, `shippingAddress1: "Adresse supprimee"`, `shippingCity: "Supprime"`, `shippingPostalCode: "00000"`.
>
> Si l'option 1 (differee) est retenue, il faut harmoniser ces 2 differences — idealement factoriser la logique d'anonymisation dans un service partage (`modules/users/services/anonymize-user.service.ts`).

> **Note** : `GET_CURRENT_USER_DEFAULT_SELECT` (`modules/users/constants/current-user.constants.ts`, select actuel : `id`, `name`, `email`, `emailVerified`, `role`, `createdAt`, `updatedAt`) devra etre enrichi avec `accountStatus` et `deletionRequestedAt` pour que l'UI puisse afficher le bandeau "Suppression en attente" et le bouton "Annuler la suppression" dans `GdprSection`.

### Decision requise

Avant d'implementer cette feature, il faut decider de l'approche de suppression :

**Option 1 - Suppression differee (recommandee RGPD)** :
- `deleteAccount` passe le statut a `PENDING_DELETION` + set `deletionRequestedAt`
- Le cron `process-account-deletions` (existe deja, tourne quotidiennement a 5:00) traite les comptes apres 30 jours de grace
- Le service `process-account-deletions.service.ts` est **deja complet** : il anonymise l'utilisateur, supprime sessions/adresses/panier/wishlist, anonymise les avis et commandes (conserve les donnees comptables), et nettoie les fichiers UploadThing
- L'utilisateur peut annuler pendant la periode de grace
- Plus conforme a l'esprit du RGPD (droit a l'oubli ≠ suppression instantanee, le reglement permet un delai raisonnable)
- **Seul `delete-account.ts` doit etre modifie** pour passer par `PENDING_DELETION` au lieu d'anonymiser immediatement

**Option 2 - Garder la suppression immediate** :
- Pas de feature M a implementer
- Le cron `process-account-deletions` et son service complet resteraient inutilises
- Plus simple mais pas de filet de securite pour les suppressions accidentelles

### Si option 1 retenue

#### Prerequis : harmoniser l'anonymisation

**Action corrective requise** avant implementation. Les deux chemins de suppression utilisent des valeurs differentes (voir inconsistance ci-dessus). Il faut factoriser la logique d'anonymisation dans un service partage (`modules/users/services/anonymize-user.service.ts`) et harmoniser les valeurs (`name`, `shippingFirstName`, `shippingLastName`).

#### Fichiers a modifier

| Fichier | Modification |
|---|---|
| `modules/users/actions/delete-account.ts` | Passer a `PENDING_DELETION` au lieu d'anonymiser |
| `modules/users/components/gdpr-section.tsx` | Ajouter bouton "Annuler la suppression" si `PENDING_DELETION` |

#### Fichiers a creer

| Fichier | Role |
|---|---|
| `modules/users/actions/cancel-account-deletion.ts` | Server action pour annuler |

#### Server action

```ts
// modules/users/actions/cancel-account-deletion.ts
"use server"

export async function cancelAccountDeletion(): Promise<ActionState> {
  const user = await requireAuth()
  if ("error" in user) return user.error

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { accountStatus: true },
  })

  if (dbUser?.accountStatus !== "PENDING_DELETION") {
    return error("Aucune demande de suppression en cours")
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      accountStatus: "ACTIVE",
      deletionRequestedAt: null,
    },
  })

  return success("Demande de suppression annulee")
}
```

#### UI (dans `GdprSection`)

Si `user.accountStatus === "PENDING_DELETION"` :
- Masquer le bouton "Supprimer mon compte"
- Afficher un bandeau d'alerte : "Votre compte sera supprime le {date + 30 jours}. Vous pouvez annuler cette demande."
- Bouton "Annuler la suppression"

---

## Champs schema exploitables non couverts

Les champs suivants existent dans le schema Prisma et/ou les selects existants mais ne sont pas encore specifies pour l'affichage client. Ils sont listes ici pour reference et priorisation.

### Affichage livraison (`estimatedDelivery` / `actualDelivery`)

Disponibles dans `GET_ORDER_SELECT` et `GET_USER_ORDERS_SELECT`. Utiles pour :
- **Liste commandes** : "Livraison estimee le X" ou "Livree le X" dans la colonne livraison de `CustomerOrdersTable`
- **Detail commande** : dans `OrderTracking` ou `OrderStatusTimeline`

### Echec de paiement (`paymentFailureCode` / `paymentDeclineCode` / `paymentFailureMessage`)

Non utilises tant que la Decision 4 reste fermee (commandes non payees masquees). Si un jour les commandes echouees sont visibles, ces champs permettraient d'afficher la raison de l'echec.

### Statut `PARTIALLY_REFUNDED` (`PaymentStatus`)

L'enum inclut `PARTIALLY_REFUNDED` mais la spec ne le mentionne pas pour l'affichage client. Si un remboursement partiel est fait, le client devrait voir "Partiellement rembourse" dans le detail commande. Les composants d'affichage de statut (`OrderStatusTimeline`, `CustomerOrdersTable`) doivent gerer ce cas.

### Statut `RETURNED` (`FulfillmentStatus`)

Le statut `RETURNED` existe dans l'enum et dans la machine d'etat (action admin `mark-as-returned`). Le client devrait voir "Retourne" dans la timeline et la liste commandes. Les composants d'affichage doivent mapper ce statut.

### Avatar utilisateur (`User.image`)

Le champ `image` (VARCHAR 2048, URL) existe mais n'est utilise nulle part dans l'espace client. Recommandation :
- **P2** : Afficher l'avatar dans la sidebar `AccountNav` et le dashboard
- **V2** : Edition de l'avatar (upload via UploadThing)

### Suspension de compte (`User.suspendedAt`)

Le schema a un champ `suspendedAt` mais aucune logique client ne le gere. Questions a trancher :
- Un utilisateur suspendu peut-il acceder a l'espace client ?
- Doit-il voir un bandeau d'information ? ("Votre compte est suspendu. Contactez le support.")
- Les actions (annulation, retour) sont-elles bloquees ?

### CTA "Laisser un avis" (`Order.reviewRequestSentAt`)

Le champ `reviewRequestSentAt` est disponible dans le schema. Si l'email de demande d'avis a ete envoye mais aucun avis n'a ete laisse, un CTA contextuel "Laisser un avis" pourrait etre affiche dans le detail commande.

### Litiges Stripe (`Dispute` model)

Hors scope espace client — les litiges sont geres dans le dashboard Stripe et l'interface admin. Evenement extremement rare pour un site de bijoux artisanaux.

### Comptes OAuth connectes (`Account` model)

Le modele `Account` stocke les providers (email, google, github). La page parametres (`SecuritySection`) pourrait afficher "Connecte via Google" et potentiellement permettre de lier/delier des comptes. Voir aussi point 5.4 ci-dessous.

---

## Preoccupations transversales

### Gestion d'erreurs

Chaque feature doit gerer :

| Scenario | Comportement attendu |
|---|---|
| Fetch echoue (erreur serveur) | Afficher un message d'erreur avec bouton retry, ou `error.tsx` boundary |
| Action echoue (mutation) | Toast d'erreur avec message contextuel, formulaire reste rempli |
| Session expiree en cours d'action | `requireAuth()` retourne `{ error: { status: ActionStatus.UNAUTHORIZED } }` — l'erreur apparait dans le formulaire via `useActionState`. La redirection vers `/connexion` est geree par le proxy middleware lors des navigations suivantes, pas lors des mutations |
| Rate limit atteint | `ActionStatus.ERROR` avec `data: { retryAfter: number, reset: number }` (secondes). L'UI affiche un countdown decremental "Reessayez dans X secondes" |
| Donnees introuvables (404) | Redirection vers la page parente ou `notFound()` |

> **Note session expiree :** `requireAuth()` ne redirige jamais — il retourne une reponse d'erreur structuree. C'est le proxy middleware (`proxy.ts`) qui gere la redirection vers `/connexion?callbackURL={pathname}` lors de la navigation suivante en verifiant le cookie de session via `getSessionCookie()`.

> **Note rate limiting :** `enforceRateLimitForCurrentUser()` (`modules/auth/lib/rate-limit-helpers.ts`) retourne `retryAfter` en secondes dans le champ `data` de la reponse d'erreur. Le composant UI doit utiliser cette valeur pour afficher un countdown decremental et desactiver le bouton de soumission jusqu'a expiration.

### Mises a jour optimistes

Le projet utilise le pattern `useOptimistic` + `useTransition` + `startTransition` (23 fichiers dans le codebase). References : `modules/wishlist/hooks/use-wishlist-toggle.ts`, `modules/cart/components/cart-item-quantity-selector.tsx`.

Matrice des mutations espace-client :

| Mutation | Optimistic ? | Justification |
|---|---|---|
| Toggle newsletter (E) | Oui (deja fait) | Reversible, feedback immediat |
| Suppression adresse (A) | Oui | Carte visible, rollback possible |
| Revocation session (G) | Oui | Ligne visible, rollback possible |
| Annulation commande (K) | Non | Irreversible, AlertDialog requis |
| Demande retour (H) | Non | Irreversible, confirmation requise |
| Changement email (I) | Non | Multi-etapes |
| Suppression compte (M) | Non | Action rare |

Pour les mutations marquees "Oui", le pattern est :
1. `useOptimistic` pour maintenir l'etat local
2. `startTransition` pour wrapper l'appel a la server action
3. Rollback automatique si l'action echoue (React reconcilie avec l'etat serveur)

### Accessibilite (WCAG 2.1 AA)

Exigences minimales pour chaque nouvelle page/composant :

- **Focus management** : apres une action (ajout, suppression, annulation), le focus revient sur l'element declencheur ou le prochain element logique
- **ARIA labels** : les boutons avec uniquement une icone doivent avoir un `aria-label` (ex: bouton "Revoquer" sur les sessions)
- **Annonces live** : les resultats d'actions (toast de succes/erreur) doivent etre annonces via `aria-live="polite"` (verifier que le systeme de toast existant le fait)
- **Navigation clavier** : tous les elements interactifs accessibles au Tab, Enter/Space pour activer, Escape pour fermer les dialogs
- **Contraste** : les badges de statut colores doivent respecter un ratio de contraste 4.5:1 minimum
- **Lecteur d'ecran** : les tableaux de donnees (commandes, sessions) doivent avoir des headers `<th>` et des `scope` corrects

### Responsive / Mobile

- Les pages avec des tableaux (commandes, sessions) doivent s'adapter en mobile : soit cards empilees, soit tableau scrollable horizontalement
- Les formulaires (email) doivent etre utilisables sur petit ecran (inputs pleine largeur)
- Les dialogs de confirmation doivent etre en plein ecran sur mobile (`sm:max-w-lg` ou pattern sheet bottom sur mobile)

### Analytics / Tracking

**V1 :** Vercel Analytics + Speed Insights (deja en place, consent RGPD via `ConditionalAnalytics`). Aucun event custom requis.

**V2 :** Events custom a tracker :

| Event | Feature | Donnees |
|---|---|---|
| `invoice_downloaded` | C | `orderNumber` |
| `session_revoked` | G | `sessionId` (anonymise) |
| `email_change_requested` | I | - |
| `email_change_confirmed` | I | - |
| `order_cancelled_by_customer` | K | `orderNumber`, `orderStatus` |
| `deletion_requested` | M | - |
| `deletion_cancelled` | M | - |
| `wishlist_add_to_cart` | J | `productId`, `skuId` |
| `return_requested` | H | `orderNumber`, `reason` |
| `orders_filtered` | F | `filterType`, `filterValue` |

### Tests

Pour chaque feature, prevoir :

- **Tests unitaires** (Vitest) : services purs, utils, validations de schemas
- **Tests d'integration** : server actions avec mocks Prisma (verifier auth, validation, mutations)
- **Tests E2E** (Playwright) : parcours critiques (annuler une commande, revoquer une session, telecharger une facture)

Priorites E2E :
1. K - Annulation commande (mutation critique)
2. H - Demande de retour (obligation legale, mutation critique)
3. G - Revocation session (securite)
4. I - Changement email (flow multi-etapes)
5. C - Telechargement facture (verification du PDF)

### Empty states

| Page | Empty state |
|---|---|
| Adresses (A) | "Vous n'avez pas encore d'adresse enregistree." + bouton "Ajouter une adresse" |
| Mes demandes (B) | "Vous n'avez pas encore fait de demande de personnalisation." + lien vers `/personnalisation` |
| Commandes (liste) | "Vous n'avez pas encore passe de commande." + lien vers `/creations` |
| Commandes (filtres actifs, F) | "Aucune commande ne correspond a vos criteres." + bouton "Reinitialiser les filtres" |
| Mes avis | "Vous n'avez pas encore laisse d'avis." |
| Sessions (G) | Impossible (au moins la session actuelle existe) |

---

## Recommendations production-ready

### Priorite P0 (legalement requis)

1. **Feature H — Demande de retour** : Obligation legale pour le e-commerce francais. Backend complet, composant a creer
2. **Condition facture enrichie** : `invoiceStatus === "GENERATED"` en plus de `paymentStatus === PAID` (evite d'afficher un bouton pour une facture non generee ou annulee)

### Priorite P1 (qualite production)

3. **Afficher `estimatedDelivery` / `actualDelivery`** dans la timeline et la liste commandes (champs deja dans les selects)
4. **Gerer `PARTIALLY_REFUNDED` et `RETURNED`** dans tous les composants d'affichage de statut
5. **Harmoniser l'anonymisation** entre `delete-account.ts` et `process-account-deletions.service.ts` avant d'implementer la Feature M
6. **Definir le comportement `suspendedAt`** — le client suspendu doit etre gere

### Priorite P2 (polish)

7. **Afficher l'avatar** (`User.image`) dans la sidebar et le dashboard
8. **Afficher les providers OAuth** dans les parametres (section securite)
9. **`SortDrawer` sur mobile** (optionnel) — avec 4 options de tri et un faible volume de commandes, le `SortSelect` natif est suffisant. Le `SortDrawer` est un raffinement UX marginal
10. **Afficher le CTA "Laisser un avis"** dans le detail commande si `reviewRequestSentAt` et pas d'avis

---

## Dependances entre fonctionnalites

```
D (remboursements) ← modifier GET_ORDER_SELECT (ajouter refunds)
H (retour client) ← modifier GET_ORDER_SELECT (ajouter refunds, partage avec D) + creer RequestReturnButton
F (filtres commandes) ← modifier schema + data fetcher (Decision 4 fermee, pas de conflit)
I (email) ← verifier Better Auth changeEmail + impacts Stripe/newsletter
J (panier wishlist) ← aucune (AddToCartCardButton deja dans ProductCard)
K (annulation commande) ← creer action client + composant, reutiliser canCancelOrder()
L (codes promo) ← modifier GET_ORDER_SELECT + OrderSummaryCard
M (annulation suppression) ← decision sur le flux de suppression (immediat vs differe) + harmoniser anonymisation
```

## Ordre d'implementation suggere

Toutes les pages sont a recreer. Commencer par les pages avec backend complet, puis celles necessitant du backend :

### Phase 1 - Pages a backend complet (pages a recreer uniquement)

1. **Nav** + **Layout** + **loading.tsx** - Layout espace-client (existe, a enrichir) + navigation + skeleton global
   - Sous-tache : migrer `favoris/page.tsx` de `PageHeader variant="default"` vers `variant="compact"` (coherence avec le nouveau layout)
   - Sous-tache : nettoyer `ROUTES.ACCOUNT` (supprimer `PROFILE`/`SECURITY` dead code, ajouter `SETTINGS`/`ADDRESSES`/`CUSTOMIZATIONS`)
2. **Dashboard** (existe, a enrichir avec `AccountStatsCards` + `RecentOrders`) + **Commandes liste** + **Mes avis** - Pages a recreer (composants complets)
3. **A** - Adresses (composants complets)
4. **B** - Mes demandes (composants complets)
5. **E** + **G** - Parametres : Newsletter settings + Sessions actives (composants complets)
6. **C** - Detail commande avec facture PDF (composant complet, condition `invoiceStatus === "GENERATED"`)

### Phase 2 - Features avec backend a completer

7. **L** - Codes promo (effort minimal, 1 select + 1 ligne UI)
8. **D** + **H** - Remboursements + Retour client (partagent la modification `GET_ORDER_SELECT` pour `refunds`. D = composant lecture, H = bouton + formulaire. **H est une obligation legale**)
9. **F** - Filtres commandes (effort faible, enrichir params existants, Decision 4 fermee)
10. **K** - Annulation commande (effort moyen, action + composant + dialog)
11. **I** - Email (effort moyen, depend de Better Auth + impacts Stripe/newsletter)
12. **M** - Annulation suppression (effort moyen, depend de la decision sur le flux + harmonisation anonymisation)
