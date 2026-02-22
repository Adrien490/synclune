# Prompts d'implementation - Espace client Synclune

> Chaque prompt est autonome et contient tout le contexte necessaire pour implementer la feature. Les executer dans l'ordre suggere (les pages de base d'abord, puis les features backend).

---

## 1. Enrichir la page Dashboard (`/compte`)

**Contexte :** La page `/compte` existe mais n'affiche qu'un profil basique (nom, email, date membre). Elle doit devenir un vrai tableau de bord avec stats et commandes recentes.

**Fichier a modifier :**
- `app/(boutique)/(espace-client)/compte/page.tsx`

**Composants existants a integrer :**
- `AccountStatsCards` (`modules/users/components/account-stats-cards.tsx`) — accepte `{ statsPromise: Promise<AccountStats>, memberSince: Date }`, utilise `use()` pour resoudre la promise. Affiche 2 cartes : "Membre depuis" et "Commandes passees". Doit etre enveloppe dans `<Suspense>` avec `AccountStatsCardsSkeleton` comme fallback.
- `RecentOrders` (`modules/orders/components/recent-orders.tsx`) — accepte `{ ordersPromise: ReturnType<typeof getUserOrders>, limit?: number, showViewAll?: boolean }`, utilise `use()`. Affiche un tableau des commandes recentes ou un empty state. Doit etre enveloppe dans `<Suspense>`.

**Data fetchers disponibles :**
- `getAccountStats()` depuis `modules/users/data/get-account-stats.ts` → retourne `Promise<AccountStats | null>`
- `getCurrentUser()` depuis `modules/users/data/get-current-user.ts` → retourne l'utilisateur avec `createdAt`
- `getUserOrders()` depuis `modules/orders/data/get-user-orders.ts` → retourne `Promise<GetUserOrdersReturn>`

**Implementation attendue :**
1. Conserver le `PageHeader` compact existant avec "Tableau de bord" et "Bonjour {prenom}"
2. Ajouter `AccountStatsCards` dans un `<Suspense>` avec `AccountStatsCardsSkeleton` comme fallback, en passant `statsPromise={getAccountStats()}` et `memberSince={user.createdAt}`
3. Ajouter `RecentOrders` dans un `<Suspense>` en dessous, avec `ordersPromise={getUserOrders({ perPage: 5 })}`, `limit={5}`, `showViewAll={true}`
4. Ajouter une section "Liens rapides" avec des `Link` vers `/commandes`, `/favoris`, `/parametres` (icones + labels)

**Pattern a suivre :** Le dashboard est un server component async. Passer les promises directement aux composants enfants (ne PAS await dans la page — laisser les composants resoudre via `use()`). Utiliser `space-y-6` pour l'espacement vertical.

**Metadata :** `{ title: "Tableau de bord" }` (deja en place).

---

## 2. Creer la page Commandes (`/commandes`)

**Contexte :** La page liste des commandes n'existe pas. Tous les composants et le backend sont prets.

**Fichier a creer :**
- `app/(boutique)/(espace-client)/commandes/page.tsx`

**Composants existants :**
- `CustomerOrdersTable` (`modules/orders/components/customer/customer-orders-table.tsx`) — server component async qui accepte la promise des commandes. Inclut deja `CursorPagination` integre. Affiche un tableau avec colonnes : numero, date, statut, livraison, articles, total. Gere le empty state avec composant `Empty`.
- `CustomerOrdersTableSkeleton` (`modules/orders/components/customer/customer-orders-table-skeleton.tsx`) — skeleton de chargement
- `SortSelect` (`shared/components/sort-select.tsx`) — select de tri utilisant `useSortSelect()` qui lit/ecrit le search param `sort` dans l'URL

**Data fetcher :**
- `getUserOrders(params?)` depuis `modules/orders/data/get-user-orders.ts` → retourne `{ orders, pagination }`
- Params : `{ cursor?, direction?, perPage?, sortBy?, search? }` — le schema est dans `modules/orders/schemas/user-orders.schemas.ts`

**Constants :**
- `USER_ORDERS_SORT_OPTIONS` dans `modules/orders/constants/user-orders.constants.ts` — 4 options de tri
- `USER_ORDERS_DEFAULT_PER_PAGE` — 10 par defaut

**Implementation attendue :**
1. Server component async avec `searchParams` (Next.js 16 : `searchParams` est une Promise)
2. Parser les search params avec le schema Zod `getUserOrdersSchema`
3. `PageHeader` compact avec titre "Mes commandes"
4. `SortSelect` avec les options de tri au-dessus du tableau
5. `CustomerOrdersTable` dans un `<Suspense>` avec `CustomerOrdersTableSkeleton`
6. Passer les params parses a `getUserOrders()`

**Metadata :** `export const metadata: Metadata = { title: "Mes commandes" }`

**Pattern search params (Next.js 16) :**
```typescript
export default async function OrdersPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
	const params = await searchParams
	const parsed = getUserOrdersSchema.parse({
		cursor: params.cursor,
		direction: params.direction,
		perPage: params.perPage ? Number(params.perPage) : undefined,
		sortBy: params.sort,
		search: params.search,
	})
	// ...
}
```

---

## 3. Creer la page Detail commande (`/commandes/[orderNumber]`)

**Contexte :** La page detail commande n'existe pas. Tous les composants d'affichage existent. La page assemble les composants dans une grille 2/3 + 1/3.

**Fichier a creer :**
- `app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx`

**Data fetcher :**
- `getOrder({ orderNumber })` depuis `modules/orders/data/get-order.ts` — gere l'auth et le scope userId automatiquement. Retourne `Order | null`. Si null, appeler `notFound()`.

**Composants existants (colonne principale 2/3) :**
- `OrderItemsList` (`modules/orders/components/customer/order-items-list.tsx`) — liste des articles
- `OrderStatusTimeline` (`modules/orders/components/customer/order-status-timeline.tsx`) — timeline de statut
- `OrderTracking` (`modules/orders/components/customer/order-tracking.tsx`) — suivi colis, visible seulement si `order.trackingNumber`

**Composants existants (colonne sidebar 1/3) :**
- `OrderSummaryCard` (`modules/orders/components/customer/order-summary-card.tsx`) — recapitulatif montants
- `OrderAddressesCard` (`modules/orders/components/customer/order-addresses-card.tsx`) — adresse de livraison
- `DownloadInvoiceButton` (`modules/orders/components/customer/download-invoice-button.tsx`) — visible seulement si `order.paymentStatus === "PAID" && order.invoiceStatus === "GENERATED"`

**Composants a creer dans des prompts separes :**
- `OrderRefundsCard` (Feature D) — colonne principale, apres OrderItemsList
- `RequestReturnButton` (Feature H) — sidebar, apres DownloadInvoiceButton
- `CancelOrderButton` (Feature K) — sidebar, en dernier

**Implementation attendue :**
1. Server component async avec `params: Promise<{ orderNumber: string }>`
2. Fetch la commande avec `getOrder({ orderNumber })`, `notFound()` si null
3. Grille responsive : `grid grid-cols-1 lg:grid-cols-3 gap-6`
4. Colonne principale (`lg:col-span-2`) : `OrderItemsList` → `OrderStatusTimeline` → `OrderTracking` (conditionnel)
5. Colonne sidebar (`lg:col-span-1 space-y-6`) : `OrderSummaryCard` → `OrderAddressesCard` → `DownloadInvoiceButton` (conditionnel)
6. `PageHeader` compact avec titre "Commande {orderNumber}" et bouton retour vers `/commandes`

**Metadata dynamique :**
```typescript
export async function generateMetadata({ params }: { params: Promise<{ orderNumber: string }> }) {
	const { orderNumber } = await params
	return { title: `Commande ${orderNumber}` }
}
```

**Gestion d'erreur :** Si `getOrder()` retourne null → `notFound()` qui affiche le `not-found.tsx` de l'espace client.

---

## 4. Creer la page Mes avis (`/mes-avis`)

**Contexte :** La page des avis n'existe pas. Les composants individuels existent tous. Il faut creer la page qui les assemble.

**Fichier a creer :**
- `app/(boutique)/(espace-client)/mes-avis/page.tsx`

**Data fetchers :**
- `getUserReviews()` depuis `modules/reviews/data/get-user-reviews.ts` → retourne `Promise<ReviewUser[]>`
- `getReviewableProducts()` depuis `modules/reviews/data/get-reviewable-products.ts` → retourne `Promise<ReviewableProduct[]>`

**Composants existants :**
- `UserReviewCard` (`modules/reviews/components/user-review-card.tsx`) — carte d'avis avec image, etoiles, statut, contenu, reponse marque. Props : `{ review: ReviewUser, className? }`
- `UserReviewCardActions` (inclus dans UserReviewCard) — actions modifier/supprimer
- `ReviewableProductCard` (`modules/reviews/components/reviewable-product-card.tsx`) — carte produit evaluable avec bouton "Laisser un avis" ouvrant un dialog. Props : `{ product: ReviewableProduct, className? }`. Client component.
- `EditReviewDialog` (`modules/reviews/components/edit-review-dialog.tsx`) — dialog d'edition, utilise le dialog store Zustand
- `DeleteReviewAlertDialog` (`modules/reviews/components/delete-review-alert-dialog.tsx`) — dialog suppression, utilise l'alert dialog store Zustand

**Implementation attendue :**
1. Server component async
2. `PageHeader` compact avec titre "Mes avis"
3. Fetch les deux promises en parallele (ne pas await, passer comme promises)
4. Creer un composant wrapper client (ex: section inline ou composant separe) qui utilise `use()` pour resoudre les promises
5. **Section "Produits a evaluer"** (si `reviewableProducts.length > 0`) : titre "Produits a evaluer" + grille de `ReviewableProductCard` (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`)
6. **Section "Mes avis"** : liste de `UserReviewCard` (`space-y-4`)
7. Monter `EditReviewDialog` et `DeleteReviewAlertDialog` dans la page (les dialogs utilisent les stores Zustand globaux)
8. **Empty state** : si 0 avis ET 0 produits evaluables → composant `Empty` avec message "Vous n'avez pas encore laisse d'avis."

**Metadata :** `export const metadata: Metadata = { title: "Mes avis" }`

---

## 5. Creer la page Adresses (`/adresses`)

**Contexte :** La page adresses n'existe pas. Tous les composants existent, y compris le composant liste avec empty state.

**Fichier a creer :**
- `app/(boutique)/(espace-client)/adresses/page.tsx`

**Data fetcher :**
- `getUserAddresses()` depuis `modules/addresses/data/get-user-addresses.ts` → retourne `Promise<UserAddress[] | null>`

**Composants existants :**
- `AddressList` (`modules/addresses/components/address-list.tsx`) — grille + empty state integre. Accepte une promise via `use()`. Inclut le bouton "Ajouter" et les `AddressCard` avec actions (modifier, supprimer, definir par defaut).
- `AddressListSkeleton` (`modules/addresses/components/address-list-skeleton.tsx`) — skeleton
- `AddressFormDialog` (`modules/addresses/components/address-form-dialog.tsx`) — dialog creation/edition
- `DeleteAddressAlertDialog` (`modules/addresses/components/delete-address-alert-dialog.tsx`) — dialog suppression

**Implementation attendue :**
1. Server component async, tres simple
2. `PageHeader` compact avec titre "Mes adresses"
3. `AddressList` dans un `<Suspense>` avec `AddressListSkeleton`, en passant `addressesPromise={getUserAddresses()}`
4. Monter `AddressFormDialog` et `DeleteAddressAlertDialog` (utilisent les stores Zustand)

**Metadata :** `export const metadata: Metadata = { title: "Mes adresses" }`

**Note :** `AddressList` gere deja l'empty state ("Vous n'avez pas encore d'adresse enregistree." + bouton "Ajouter une adresse"). Pas besoin de le gerer dans la page.

---

## 6. Creer la page Mes demandes (`/mes-demandes`)

**Contexte :** La page des demandes de personnalisation n'existe pas. Les composants liste et carte existent.

**Fichier a creer :**
- `app/(boutique)/(espace-client)/mes-demandes/page.tsx`

**Data fetcher :**
- `getUserCustomizationRequests()` depuis `modules/customizations/data/get-user-customization-requests.ts` → retourne une promise de demandes

**Composants existants :**
- `CustomizationRequestList` (`modules/customizations/components/customer/customization-request-list.tsx`) — liste avec empty state, accepte une promise via `use()`. Affiche grille de `CustomizationRequestCard`. Empty state : lien vers `/personnalisation`.
- `CustomizationRequestCard` (`modules/customizations/components/customer/customization-request-card.tsx`) — carte individuelle avec statut, details, images d'inspiration

**Implementation attendue :**
1. Server component async, tres simple
2. `PageHeader` compact avec titre "Mes demandes"
3. `CustomizationRequestList` dans un `<Suspense>` en passant la promise

**Metadata :** `export const metadata: Metadata = { title: "Mes demandes" }`

---

## 7. Creer la page Parametres (`/parametres`)

**Contexte :** La page parametres n'existe pas. Elle rassemble profil, securite, RGPD, newsletter et sessions actives dans une grille 2/3 + 1/3. Le composant `SecuritySection` n'existe pas et doit etre cree.

**Fichier a creer :**
- `app/(boutique)/(espace-client)/parametres/page.tsx`

**Composant a creer :**
- `modules/users/components/security-section.tsx` — wrapper qui affiche :
  1. Un bouton "Modifier mon mot de passe" ouvrant `ChangePasswordDialog` (uniquement si le compte utilise le provider "email" — les comptes OAuth n'ont pas de mot de passe)
  2. Un statut de verification email avec `ResendVerificationButton` si `emailVerified === false`
  3. Les providers OAuth connectes (Google, GitHub) affiches en lecture seule ("Connecte via Google", etc.)

**Data fetchers :**
- `getCurrentUser()` depuis `modules/users/data/get-current-user.ts` — retourne l'utilisateur
- `getSubscriptionStatus()` depuis `modules/newsletter/data/get-subscription-status.ts` — retourne `{ isSubscribed, email, isConfirmed }`
- Pour les providers OAuth : requete Prisma sur le modele `Account` filtre par `userId` (select `providerId` uniquement)

**Composants existants :**
- `ProfileForm` (`modules/users/components/profile-form.tsx`) — formulaire nom + email disabled. Props : `{ user: { name, email } }`
- `ChangePasswordDialog` (`modules/users/components/change-password-dialog.tsx`) — dialog modal. Props : `{ open, onOpenChange }`
- `ResendVerificationButton` (`modules/users/components/resend-verification-button.tsx`) — bouton avec cooldown 60s
- `GdprSection` (`modules/users/components/gdpr-section.tsx`) — carte RGPD avec export + suppression. Pas de props.
- `NewsletterSettingsCard` (`modules/newsletter/components/newsletter-settings-card.tsx`) — carte toggle newsletter. Props : `{ isSubscribed, email, isConfirmed }`. Client component.
- `ActiveSessionsCard` (`modules/auth/components/active-sessions-card.tsx`) — carte sessions actives. Fetch ses propres donnees.

**Implementation attendue :**

**Page (`parametres/page.tsx`) :**
1. Server component async
2. `PageHeader` compact avec titre "Parametres"
3. Grille responsive : `grid grid-cols-1 lg:grid-cols-3 gap-6`
4. Colonne principale (`lg:col-span-2 space-y-6`) : `ProfileForm` → `SecuritySection` → `GdprSection`
5. Colonne sidebar (`lg:col-span-1 space-y-6`) : `NewsletterSettingsCard` (dans `<Suspense>`) → `ActiveSessionsCard`
6. Passer les donnees utilisateur a `ProfileForm` et `SecuritySection`

**SecuritySection (`security-section.tsx`) :**
1. Client component (`"use client"`)
2. Props : `{ emailVerified: boolean, providers: string[] }` (providers = liste des `providerId` du modele `Account`)
3. `Card` avec titre "Securite" et icone `Shield`
4. Si `providers.includes("email")` → bouton "Modifier mon mot de passe" avec state `open` pour `ChangePasswordDialog`
5. Si `!emailVerified` → section verification email avec `ResendVerificationButton`
6. Section providers OAuth : lister les providers connectes avec badges ("Connecte via Google", "Connecte via GitHub")

**Metadata :** `export const metadata: Metadata = { title: "Parametres" }`

---

## 8. Feature L — Afficher les codes promo sur la commande

**Contexte :** `OrderSummaryCard` affiche deja `discountAmount` en vert mais pas le code promo utilise. `GET_ORDER_SELECT` inclut deja `discountUsages` avec `discountCode` et `amountApplied`. Il suffit de modifier le composant d'affichage.

**Fichier a modifier :**
- `modules/orders/components/customer/order-summary-card.tsx`

**Donnees disponibles :** `order.discountUsages` est un tableau de `{ discountCode: string, amountApplied: number }` deja present dans le select.

**Modification attendue :**
1. Ajouter `discountUsages` au type des props du composant (dans l'interface `order`)
2. Dans le bloc qui affiche la reduction (`order.discountAmount > 0`), modifier la ligne :
   - **Avant :** `<span>Reduction</span>`
   - **Apres :** `<span>Reduction{order.discountUsages?.length > 0 && ` (${order.discountUsages.map(d => d.discountCode).join(", ")})`}</span>`
3. Si plusieurs codes (rare), les joindre par virgule : `(PROMO20, BIENVENUE)`

**Resultat visuel :**
- Avant : `Reduction -12,50 EUR`
- Apres : `Reduction (PROMO20) -12,50 EUR`

---

## 9. Feature D — Historique des remboursements (OrderRefundsCard)

**Contexte :** `GET_ORDER_SELECT` inclut deja `refunds` avec les items, statuts et montants. Il faut creer un composant client pour les afficher dans la page detail commande.

**Fichier a creer :**
- `modules/orders/components/customer/order-refunds-card.tsx`

**Donnees disponibles (via `GET_ORDER_SELECT`) :**
```typescript
order.refunds: Array<{
	id: string
	amount: number        // en centimes
	currency: string
	reason: RefundReason  // CUSTOMER_REQUEST | DEFECTIVE | WRONG_ITEM | LOST_IN_TRANSIT | FRAUD | OTHER
	status: RefundStatus  // PENDING | APPROVED | COMPLETED | REJECTED | FAILED | CANCELLED
	note: string | null
	processedAt: Date | null
	createdAt: Date
	items: Array<{
		id: string
		quantity: number
		amount: number    // en centimes
		orderItem: { productTitle: string, skuColor: string | null }
	}>
}>
```

**Constants existantes a reutiliser (NE PAS creer de doublons) :**
- `REFUND_STATUS_LABELS` dans `modules/refunds/constants/refund.constants.ts` : "En attente", "Approuve", "Rembourse", etc.
- `REFUND_STATUS_COLORS` dans le meme fichier : hex strings (`#f59e0b`, `#3b82f6`, etc.) — utiliser `style={{ color }}` ou `style={{ backgroundColor }}`
- `REFUND_REASON_LABELS` : "Retractation client", "Produit defectueux", etc.

**Implementation attendue :**
1. Server component
2. Props : `{ refunds: Order["refunds"] }` (type infere du select)
3. Ne PAS rendre le composant si `refunds.length === 0` (gere dans la page parente)
4. `Card` avec titre "Remboursements" et icone `RefreshCcw` ou `ReceiptText`
5. Si plusieurs remboursements, afficher le total cumule en haut : "Total rembourse : XX,XX EUR"
6. Pour chaque remboursement :
   - Badge de statut avec label et couleur (utiliser `style={{ backgroundColor, color }}` car les couleurs sont en hex)
   - Montant formatte avec `formatEuro(amount)` (attention : montant en centimes, `formatEuro` attend des centimes)
   - Raison avec label francais
   - Date de creation + date de traitement si `processedAt`
   - Liste des articles concernes : "ProductTitle (couleur) x quantite"

**Placement :** Colonne principale (2/3), apres `OrderItemsList` et avant `OrderStatusTimeline`. Condition : `order.refunds.length > 0`.

---

## 10. Feature H — Bouton de demande de retour client

**Contexte :** L'action `requestReturn` existe et est complete dans `modules/refunds/actions/request-return.ts`. Elle gere auth, rate limit, IDOR, verification 14 jours, creation Refund PENDING. Il faut creer le composant bouton + dialog.

**Fichier a creer :**
- `modules/refunds/components/customer/request-return-button.tsx`

**Action existante :**
- `requestReturn` dans `modules/refunds/actions/request-return.ts` — attend `FormData` avec `orderId`, `reason`, `message`

**Schema existant :**
- `requestReturnSchema` dans `modules/refunds/schemas/refund.schemas.ts` — `orderId: cuid2`, `reason: enum(CUSTOMER_REQUEST, DEFECTIVE, WRONG_ITEM)`, `message: string.max(500).optional()`

**Conditions d'affichage (gerees dans la page parente) :**
- `order.paymentStatus` in [`PAID`, `PARTIALLY_REFUNDED`]
- `order.fulfillmentStatus === "DELIVERED"`
- `order.actualDelivery + 14j > now()`
- Aucun refund avec statut `PENDING` ou `APPROVED`

**Implementation attendue :**
1. Client component (`"use client"`)
2. Props : `{ orderId: string, daysRemaining: number }` — `daysRemaining` calcule dans la page parente
3. Bouton "Demander un retour" qui ouvre un dialog (utiliser `ResponsiveDialog` du projet pour mobile/desktop)
4. Dans le dialog :
   - Texte informatif : "Il vous reste {daysRemaining} jours pour exercer votre droit de retractation."
   - Select `reason` avec 3 options : "Retractation (changement d'avis)", "Produit defectueux", "Erreur de preparation" — utiliser les labels de `REFUND_REASON_LABELS` filtres pour les 3 raisons client
   - Textarea `message` optionnel : "Precisions sur votre demande (facultatif)" — max 500 caracteres
   - Bouton "Envoyer ma demande" avec loading state
5. Utiliser `useActionState` avec l'action `requestReturn`
6. Apres succes : toast de confirmation + fermer le dialog + `router.refresh()`

**Placement dans la page detail commande :** Sidebar (1/3), apres `DownloadInvoiceButton`, avant `CancelOrderButton`. Calculer `daysRemaining` dans la page : `14 - Math.floor((Date.now() - order.actualDelivery.getTime()) / (24*60*60*1000))`.

---

## 11. Feature K — Bouton d'annulation de commande client

**Contexte :** L'action `cancelOrderCustomer` existe dans `modules/orders/actions/cancel-order-customer.ts`. Elle gere auth, IDOR, guard PENDING only, restauration stock, audit trail, email d'annulation. Il faut creer le composant bouton.

**Fichier a creer :**
- `modules/orders/components/customer/cancel-order-button.tsx`

**Action existante :**
- `cancelOrderCustomer` dans `modules/orders/actions/cancel-order-customer.ts` — attend `FormData` avec `orderNumber`

**Fonction utilitaire :**
- `canCancelOrder(order)` dans `modules/orders/services/order-status-validation.service.ts` — retourne `true` si pas SHIPPED/DELIVERED/CANCELLED

**Conditions d'affichage (gerees dans la page parente) :**
- `canCancelOrder(order)` retourne `true` (exclut SHIPPED, DELIVERED, CANCELLED)
- Guard supplementaire client : `order.status === "PENDING"` (l'action accepte aussi PROCESSING pour les admins, mais le bouton client ne doit apparaitre que pour PENDING)

**Implementation attendue :**
1. Client component (`"use client"`)
2. Props : `{ orderNumber: string }`
3. Bouton "Annuler la commande" avec variante `destructive` ou `outline` avec texte rouge
4. Au clic, ouvrir un `AlertDialog` de confirmation : "Etes-vous sur de vouloir annuler cette commande ? Cette action est irreversible."
5. Bouton de confirmation avec loading state (Loader2 spinner)
6. Utiliser `useActionState` avec l'action `cancelOrderCustomer`, passer `orderNumber` dans un hidden input ou FormData
7. Apres succes : toast de confirmation + `router.refresh()`

**Placement dans la page detail commande :** Sidebar (1/3), dernier element. Condition : `order.status === "PENDING"`.

---

## 12. Feature F — Barre de recherche commandes

**Contexte :** Le backend gere deja le param `search` — le schema `getUserOrdersSchema` inclut `search: z.string().max(50).optional()` et `fetch-user-orders.ts` filtre par `orderNumber contains insensitive`. Il faut creer le composant UI de recherche.

**Fichier a creer :**
- `modules/orders/components/customer/customer-orders-filters.tsx`

**Fichier a modifier :**
- `app/(boutique)/(espace-client)/commandes/page.tsx` — integrer le composant de recherche

**Implementation attendue :**

**CustomerOrdersFilters (`customer-orders-filters.tsx`) :**
1. Client component (`"use client"`)
2. Input de recherche par numero de commande avec icone `Search`
3. Utiliser les search params URL (pattern existant dans le projet avec `useRouter`, `useSearchParams`, `usePathname`)
4. Debounce la saisie (300ms) avant de mettre a jour le search param `search` dans l'URL
5. Bouton "X" pour effacer la recherche
6. Placeholder : "Rechercher par numero de commande..."
7. Afficher le filtre au-dessus du tableau, a cote du `SortSelect`

**Integration dans la page commandes :**
1. Layout flex entre `CustomerOrdersFilters` et `SortSelect` : `flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between`
2. Le search param `search` est deja parse et passe a `getUserOrders()`

**Empty state filtre :** Si la recherche ne retourne aucun resultat, `CustomerOrdersTable` gere deja un empty state. Verifier qu'il affiche "Aucune commande ne correspond a vos criteres" + bouton "Reinitialiser les filtres" (lien sans search params).

---

## 13. Feature I — Modification d'email

**Contexte :** `ProfileForm` affiche l'email en lecture seule (`<Input disabled>`). Better Auth supporte `changeEmail` mais le plugin n'est PAS configure dans `modules/auth/lib/auth.ts`. Cette feature necessite du backend.

**Prerequis bloquant :** Verifier si Better Auth v2 supporte `changeEmail` nativement ou via plugin. Configurer le plugin dans `modules/auth/lib/auth.ts`.

**Fichiers a creer :**
- `modules/users/actions/change-email.ts` — server action
- `modules/users/components/change-email-dialog.tsx` — dialog avec formulaire

**Fichier a modifier :**
- `modules/users/components/profile-form.tsx` — remplacer l'input email disabled par email affiche + bouton "Modifier" ouvrant le dialog
- `modules/auth/lib/auth.ts` — ajouter le plugin `changeEmail` a la config Better Auth (si applicable)

**Flow attendu :**
1. L'utilisateur clique "Modifier mon email" dans `ProfileForm`
2. Un dialog demande la nouvelle adresse email
3. L'action serveur `changeEmail` :
   - `requireAuth()`
   - Valider le format email avec Zod
   - Appeler `auth.api.changeEmail({ newEmail, callbackURL: "/parametres" })`
   - Better Auth envoie un email de verification a la nouvelle adresse
   - Retourner un message "Un email de verification a ete envoye a {newEmail}"
4. Apres confirmation par l'utilisateur (clic dans l'email), l'email est mis a jour

**Impacts a gerer :**
- **Stripe** : mettre a jour l'email du customer Stripe si `stripeCustomerId` existe
- **Newsletter** : mettre a jour `NewsletterSubscriber.email` si l'utilisateur est inscrit
- Si les mises a jour Stripe/newsletter echouent, logger l'erreur mais retourner succes (le changement principal est reussi)

**Note :** Cette feature est la plus complexe. Si Better Auth ne supporte pas `changeEmail` facilement, implementer manuellement : creer un token de verification, envoyer un email avec React Email + Resend, et mettre a jour sur confirmation.

---

## 14. Feature M — Annulation de suppression de compte

**Contexte :** Le schema Prisma prevoit `PENDING_DELETION` avec `deletionRequestedAt`, mais `delete-account.ts` anonymise immediatement. Le cron `process-account-deletions` existe et fonctionne mais n'a rien a traiter. Cette feature active le flow de suppression differee.

**Decision requise :** Cette feature depend de la Decision 3 (suppression immediate vs differee). Si differee est retenue :

**Fichiers a modifier :**
- `modules/users/actions/delete-account.ts` — changer pour passer a `PENDING_DELETION` au lieu d'anonymiser immediatement
- `modules/users/components/gdpr-section.tsx` — ajouter bandeau + bouton annulation si `PENDING_DELETION`
- `modules/users/constants/current-user.constants.ts` — ajouter `accountStatus` et `deletionRequestedAt` au `GET_CURRENT_USER_DEFAULT_SELECT`

**Fichier a creer :**
- `modules/users/actions/cancel-account-deletion.ts`

**Prerequis : harmoniser l'anonymisation.** Les deux chemins de suppression (`delete-account.ts` et `process-account-deletions.service.ts`) utilisent des valeurs differentes pour l'anonymisation :
- `delete-account.ts` : nom → "Compte supprime", noms livraison → "Anonyme"
- `process-account-deletions.service.ts` : nom → "Utilisateur supprime", noms livraison → "X"

Factoriser dans un service partage : `modules/users/services/anonymize-user.service.ts`

**Modification de `delete-account.ts` :**
```typescript
// AVANT : anonymisation immediate (tout le code de la transaction)
// APRES :
await prisma.user.update({
	where: { id: user.id },
	data: {
		accountStatus: "PENDING_DELETION",
		deletionRequestedAt: new Date(),
	},
})
// Deconnexion + invalidation cache
// Le cron process-account-deletions gerera l'anonymisation apres 30 jours
```

**Action `cancelAccountDeletion` :**
```typescript
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
		data: { accountStatus: "ACTIVE", deletionRequestedAt: null },
	})

	return success("Demande de suppression annulee")
}
```

**Modification de `GdprSection` :**
- Props : ajouter `{ accountStatus?: string, deletionRequestedAt?: Date | null }`
- Si `accountStatus === "PENDING_DELETION"` :
  - Masquer le bouton "Supprimer mon compte"
  - Afficher un bandeau d'alerte : "Votre compte sera supprime le {deletionRequestedAt + 30 jours}."
  - Bouton "Annuler la suppression" appelant `cancelAccountDeletion`

**Enrichir `GET_CURRENT_USER_DEFAULT_SELECT` :**
Ajouter `accountStatus: true` et `deletionRequestedAt: true` au select dans `current-user.constants.ts`.

---

## 15. Mise a jour de la page Detail commande (assemblage final)

**Contexte :** Apres avoir cree les composants des Features D, H et K, mettre a jour la page detail commande pour les integrer.

**Fichier a modifier :**
- `app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx`

**Ajouts a la colonne principale (2/3) :**
- `OrderRefundsCard` apres `OrderItemsList`, conditionnel : `{order.refunds.length > 0 && <OrderRefundsCard refunds={order.refunds} />}`

**Ajouts a la sidebar (1/3) :**
- `RequestReturnButton` apres `DownloadInvoiceButton`, conditionnel :
```typescript
{order.paymentStatus in ["PAID", "PARTIALLY_REFUNDED"]
	&& order.fulfillmentStatus === "DELIVERED"
	&& order.actualDelivery
	&& (Date.now() - order.actualDelivery.getTime()) < 14 * 24 * 60 * 60 * 1000
	&& !order.refunds.some(r => r.status === "PENDING" || r.status === "APPROVED")
	&& <RequestReturnButton orderId={order.id} daysRemaining={14 - Math.floor((Date.now() - order.actualDelivery.getTime()) / (24*60*60*1000))} />
}
```
- `CancelOrderButton` en dernier, conditionnel : `{order.status === "PENDING" && <CancelOrderButton orderNumber={order.orderNumber} />}`

---

## Ordre d'execution recommande

1. **Dashboard** (prompt 1) — enrichir la page existante
2. **Commandes liste** (prompt 2) — creer la page
3. **Detail commande** (prompt 3) — creer la page de base
4. **Mes avis** (prompt 4)
5. **Adresses** (prompt 5)
6. **Mes demandes** (prompt 6)
7. **Parametres** (prompt 7) — inclut la creation de `SecuritySection`
8. **Codes promo** (prompt 8) — modification mineure d'un composant existant
9. **Remboursements** (prompt 9) — creer le composant
10. **Retour client** (prompt 10) — creer le composant (obligation legale)
11. **Annulation commande** (prompt 11) — creer le composant
12. **Recherche commandes** (prompt 12) — creer le composant + integrer
13. **Assemblage final detail commande** (prompt 15) — integrer D, H, K
14. **Modification email** (prompt 13) — le plus complexe, backend a creer
15. **Suppression differee** (prompt 14) — depend de la decision 3
