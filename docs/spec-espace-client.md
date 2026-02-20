# Spec technique - Espace client Synclune

> Ce document detaille les fonctionnalites de l'espace client (A-M) + la navigation, avec pour chaque item : le statut d'implementation, les fichiers a creer/modifier, les patterns a suivre, les donnees disponibles, et les dependances.
>
> **Les pages ont ete supprimees** (`app/(boutique)/(espace-client)/`) pour etre reconstruites de zero. Tous les composants modules, actions, data, hooks et services restent intacts.

---

## Tableau de suivi

| Feature | Statut | Backend | Effort | Notes |
|---|---|---|---|---|
| Navigation (7 items) | A faire | Complet | Faible | Page a recreer, composants modules intacts |
| A - Adresses | A faire | Complet | Faible | Page a recreer, composants modules intacts |
| B - Mes demandes | A faire | Complet | Faible | Page a recreer, composants modules intacts |
| C - Facture PDF | A faire | Complet | Faible | Page a recreer, fix securite `order.userId` applique |
| D - Remboursements | A faire | A completer | Faible | Modifier `GET_ORDER_SELECT` + 1 composant |
| E - Newsletter settings | A faire | Complet | Faible | Page a recreer, composants modules intacts |
| F - Filtres commandes | A faire | A completer | Faible | Params types mais pas wires, conflit `paymentStatus: PAID` hardcode |
| G - Sessions actives | A faire | Complet | Faible | Page a recreer, composants modules intacts |
| H - Avatar upload | A faire | A completer | Moyen | Nouvelle route UploadThing + composant. Prerequis : fix RGPD (Feature M) |
| I - Changement email | A faire | A completer | Moyen | Email toujours read-only dans `ProfileForm` |
| J - Panier wishlist | A faire | Complet | Faible | `AddToCartCardButton` deja dans `ProductCard` |
| K - Annulation commande client | A faire | A completer | Moyen | `cancelOrder` admin-only, mais `canCancelOrder()` reutilisable |
| L - Codes promo sur commande | A faire | A completer | Faible | `discountAmount` affiche mais pas le code |
| M - Annulation suppression compte | A faire | A completer | Moyen | `PENDING_DELETION` non utilise, `deletionRequestedAt` dead code |

---

## Architecture transversale

### Layout espace-client

Le layout utilise une grille 2 colonnes (desktop) :
- **Colonne gauche (2/3)** : contenu principal (nav mobile + page content)
- **Colonne droite (1/3)** : sidebar de navigation (desktop only, via `AccountNav`)

### Pattern page detail commande (`/commandes/[orderNumber]`)

La page affiche la commande dans une grille 2/3 + 1/3 :
- **Colonne principale (2/3)** : `OrderItemsList` → `OrderRefundsCard` (si refunds) → `OrderTracking`
- **Colonne sidebar (1/3)** : `OrderSummaryCard` → `OrderInfoCard` → `DownloadInvoiceButton` (si PAID)

### Pattern page parametres (`/parametres`)

La page parametres utilise aussi une grille 2/3 + 1/3 :
- **Colonne principale (2/3)** : `ProfileForm` → `SecuritySection` (change password) → `GdprSection` (export/delete)
- **Colonne sidebar (1/3)** : `AvatarUpload` (Feature H) → `NewsletterSettingsCard` → `ActiveSessionsCard`

### Pattern page compte (`/compte`) - Dashboard

Page tableau de bord avec stats et raccourcis :
- Nombre de commandes, montant total depense
- Derniere commande
- Nombre de favoris
- Liens rapides vers les sections principales

---

## Navigation transversale

> **Statut : A faire** — Backend complet, page a recreer

### Fichier existant

`modules/users/components/account-nav.tsx`

### Implementation actuelle

7 entrees dans `navItems` avec `desktopOnly: true` pour Adresses et Mes demandes (filtrees en mobile) :

```ts
import { Heart, LayoutDashboard, MapPin, MessageSquare, Package, Settings, Sparkles } from "lucide-react";

const navItems = [
  { href: "/compte", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/commandes", label: "Commandes", icon: Package },
  { href: "/mes-avis", label: "Mes avis", icon: MessageSquare },
  { href: "/favoris", label: "Favoris", icon: Heart },
  { href: "/adresses", label: "Adresses", icon: MapPin, desktopOnly: true },
  { href: "/mes-demandes", label: "Mes demandes", icon: Sparkles, desktopOnly: true },
  { href: "/parametres", label: "Parametres", icon: Settings },
];
```

### Attention mobile

La bottom bar affiche 5 items. Les 2 items `desktopOnly` restent accessibles via la sidebar desktop et le tableau de bord.

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
- Condition : affiche uniquement si `order.paymentStatus === "PAID"`

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
- **Data client** : aucun data fetcher client n'existe pour les remboursements, fichier a creer
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

### Implementation actuelle

- `NewsletterSettingsCard` dans la sidebar parametres
- Utilise `getSubscriptionStatus()` pour l'etat actuel
- Toggle inscription/desinscription

### Donnees disponibles

```ts
import { getSubscriptionStatus } from "@/modules/newsletter/data/get-subscription-status";
const status = await getSubscriptionStatus();
// → { isSubscribed: boolean, email: string | null, emailVerified: boolean }
```

---

## F - Filtrage/recherche des commandes

> **Statut : A faire** — Backend a completer (tri implemente, filtres non)

### Statut actuel

- **Schema actuel** : `user-orders.schemas.ts` ne contient que `cursor`, `direction`, `perPage`, `sortBy` - aucun champ de filtre n'est defini
- **Tri** : implemente via `SortSelect` avec 4 options
- **Backend** : `fetch-user-orders.ts` hardcode `paymentStatus: PaymentStatus.PAID` sans filtres supplementaires
- **UI filtres** : absente

### Attention : conflit potentiel avec `paymentStatus: PAID` hardcode

`fetch-user-orders.ts:52` hardcode `paymentStatus: PaymentStatus.PAID` pour n'afficher que les commandes payees. Si on ajoute un filtre par statut de commande, il faut decider si les commandes non-payees (PENDING, FAILED) doivent etre visibles. Les params `filter_status` et `filter_fulfillmentStatus` existent deja dans le composant admin `orders-filter-sheet.tsx` mais ne sont pas wires cote client.

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

- `ActiveSessionsCard` dans `modules/auth/components/active-sessions-card.tsx`
- Listing des sessions non expirees
- Bouton "Revoquer" par session

### Identification de la session actuelle

La session actuelle est identifiee en comparant `session.token` (du cookie Better Auth) avec le `token` de chaque session en base. La session en cours affiche un badge "Session actuelle" et le bouton "Revoquer" est masque.

### UI

Chaque session affiche :
- Icone appareil (parser `userAgent` : desktop/mobile/tablet)
- Navigateur + OS (parser `userAgent`)
- Adresse IP (masquee partiellement pour securite)
- Date de connexion
- Badge "Session actuelle" pour la session en cours
- Bouton "Revoquer" (sauf session actuelle)

### Gestion d'erreur

Si la revocation echoue (ex: session deja expiree) : toast d'erreur + refresh de la liste pour synchroniser l'etat.

---

## H - Upload d'avatar

> **Statut : A faire** — Backend a completer. **Prerequis : fix RGPD (Feature M)** - `delete-account.ts` doit gerer la suppression de l'image avatar

### Statut actuel

- **Schema** : `User.image` existe (`String? @db.VarChar(2048)`)
- **Upload** : UploadThing configure avec 4 routes (`testimonialMedia`, `catalogMedia`, `contactAttachment`, `reviewMedia`)
- **UI** : aucune
- **Fallback existant** : l'UI affiche deja les initiales de l'utilisateur quand `User.image` est null (verifier dans les composants de header/nav)

### Fix RGPD applique

`delete-account.ts` fait maintenant une requete separee pour l'image (`select: { image: true }`) avant anonymisation, ce qui permet de supprimer le fichier UploadThing associe.

### Fichiers a creer

| Fichier | Role |
|---|---|
| `modules/users/components/avatar-upload.tsx` | Composant upload + preview |
| `modules/users/actions/update-avatar.ts` | Server action pour mettre a jour `User.image` |

### Fichier a modifier

| Fichier | Modification |
|---|---|
| `app/api/uploadthing/core.ts` | Ajouter route `avatarMedia` |
| `app/(boutique)/(espace-client)/parametres/page.tsx` | **A creer** - Ajouter `<AvatarUpload>` dans la carte profil |
| `modules/users/constants/current-user.constants.ts` | Ajouter `image: true` au select |

### Nouvelle route UploadThing

```ts
// Dans app/api/uploadthing/core.ts
avatarMedia: f({
  image: { maxFileSize: "2MB", maxFileCount: 1 },
})
  .middleware(async ({ files }) => {
    const session = await getSession();
    if (!session?.user) throw new UploadThingError("Non connecte");

    // Rate limiting
    // Validation MIME (images uniquement)
    // Validation taille (2MB max)

    return { userId: session.user.id };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    // Mettre a jour User.image
    await prisma.user.update({
      where: { id: metadata.userId },
      data: { image: file.ufsUrl },
    });

    // Invalider le cache utilisateur
    updateTag(USERS_CACHE_TAGS.CURRENT_USER(metadata.userId));

    return { url: file.ufsUrl };
  }),
```

### UI

- Cercle avec avatar actuel (ou initiales si pas d'image - fallback existant)
- Bouton "Modifier" overlay au hover
- Preview avant upload
- Bouton "Supprimer" si image existante (set `User.image` a null)

### Crop / Resize

L'image n'est pas croppee cote client pour simplifier l'implementation. UploadThing gere le stockage. Pour un crop carre :
- Option 1 : CSS `object-fit: cover` + `border-radius: 50%` (pas de crop reel, juste visuel)
- Option 2 : Ajouter un crop cote client avec une lib comme `react-image-crop` (plus complexe)

**Recommandation** : commencer par le crop CSS uniquement (option 1).

---

## I - Modification d'email

> **Statut : A faire** — Backend a completer

### Statut actuel

- **ProfileForm** : email affiche en read-only (`disabled`, message "L'adresse email ne peut pas etre modifiee")
- **Better Auth** : supporte `changeEmail` via son API (`auth.api.changeEmail`)
- **Schema** : `User.email` + `User.emailVerified`

### Approche

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

- **Stripe** : le `stripeCustomerId` est lie au customer Stripe. Apres changement d'email, il faut mettre a jour l'email du customer Stripe via `stripe.customers.update(stripeCustomerId, { email: newEmail })`. Sinon les emails de Stripe (recus de paiement) iront a l'ancienne adresse.
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
| `app/(boutique)/(espace-client)/favoris/page.tsx` | **A creer** - Page favoris |
| `modules/products/components/product-card.tsx` | Carte produit (inclut `AddToCartCardButton`) |
| `modules/cart/components/add-to-cart-card-button.tsx` | Bouton ajout panier (existant) |

### Donnees disponibles

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
  CREATED          // Creation de la commande
  PAID             // Paiement recu
  PROCESSING       // Mise en preparation
  SHIPPED          // Expedition
  DELIVERED        // Livraison confirmee
  CANCELLED        // Annulation
  RETURNED         // Retour client
  STATUS_REVERTED  // Retour a un statut precedent
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

  // Restauration stock conditionnelle (PENDING seulement)
  const shouldRestoreStock = order.paymentStatus === "PENDING"

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    })

    if (shouldRestoreStock) {
      // Restore stock for each SKU
    }

    await createOrderAuditTx(tx, {
      orderId: order.id,
      action: "CANCELLED",
      previousStatus: order.status,
      newStatus: "CANCELLED",
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

## Preoccupations transversales

### Gestion d'erreurs

Chaque feature doit gerer :

| Scenario | Comportement attendu |
|---|---|
| Fetch echoue (erreur serveur) | Afficher un message d'erreur avec bouton retry, ou `error.tsx` boundary |
| Action echoue (mutation) | Toast d'erreur avec message contextuel, formulaire reste rempli |
| Session expiree en cours d'action | Redirection vers `/connexion` avec `callbackUrl` vers la page actuelle |
| Rate limit atteint | Message "Trop de tentatives, reessayez dans X secondes" |
| Donnees introuvables (404) | Redirection vers la page parente ou `notFound()` |

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
- Les formulaires (email, avatar) doivent etre utilisables sur petit ecran (inputs pleine largeur)
- Les dialogs de confirmation doivent etre en plein ecran sur mobile (`sm:max-w-lg` ou pattern sheet bottom sur mobile)

### Analytics / Tracking

Events a tracker (si Vercel Analytics ou custom events) :

| Event | Feature | Donnees |
|---|---|---|
| `invoice_downloaded` | C | `orderNumber` |
| `session_revoked` | G | `sessionId` (anonymise) |
| `avatar_uploaded` | H | - |
| `avatar_removed` | H | - |
| `email_change_requested` | I | - |
| `email_change_confirmed` | I | - |
| `order_cancelled_by_customer` | K | `orderNumber`, `orderStatus` |
| `deletion_requested` | M | - |
| `deletion_cancelled` | M | - |
| `wishlist_add_to_cart` | J | `productId`, `skuId` |
| `orders_filtered` | F | `filterType`, `filterValue` |

### Tests

Pour chaque feature, prevoir :

- **Tests unitaires** (Vitest) : services purs, utils, validations de schemas
- **Tests d'integration** : server actions avec mocks Prisma (verifier auth, validation, mutations)
- **Tests E2E** (Playwright) : parcours critiques (annuler une commande, revoquer une session, telecharger une facture)

Priorites E2E :
1. K - Annulation commande (mutation critique)
2. G - Revocation session (securite)
3. I - Changement email (flow multi-etapes)
4. C - Telechargement facture (verification du PDF)

### Empty states

| Page | Empty state |
|---|---|
| Adresses (A) | "Vous n'avez pas encore d'adresse enregistree." + bouton "Ajouter une adresse" |
| Mes demandes (B) | "Vous n'avez pas encore fait de demande de personnalisation." + lien vers `/personnalisation` |
| Commandes (liste) | "Vous n'avez pas encore passe de commande." + lien vers `/creations` |
| Commandes (filtres actifs, F) | "Aucune commande ne correspond a vos criteres." + bouton "Reinitialiser les filtres" |
| Favoris | "Votre liste de favoris est vide." + lien vers `/creations` |
| Mes avis | "Vous n'avez pas encore laisse d'avis." |
| Sessions (G) | Impossible (au moins la session actuelle existe) |

---

## Dependances entre fonctionnalites

```
D (remboursements) ← modifier GET_ORDER_SELECT
F (filtres commandes) ← modifier schema + data fetcher, resoudre conflit paymentStatus: PAID
H (avatar) ← modifier UploadThing core + user select, prerequis fix RGPD (M)
I (email) ← verifier Better Auth changeEmail + impacts Stripe/newsletter
J (panier wishlist) ← aucune (AddToCartCardButton deja dans ProductCard)
K (annulation commande) ← creer action client + composant, reutiliser canCancelOrder()
L (codes promo) ← modifier GET_ORDER_SELECT + OrderSummaryCard
M (annulation suppression) ← decision sur le flux de suppression (immediat vs differe)
```

## Ordre d'implementation suggere

Toutes les pages sont a recreer. Commencer par les pages avec backend complet, puis celles necessitant du backend :

### Phase 1 - Pages a backend complet (pages a recreer uniquement)

1. **Nav** + **Layout** - Layout espace-client + navigation
2. **A** - Adresses (composants complets)
3. **B** - Mes demandes (composants complets)
4. **E** - Newsletter settings (composant complet)
5. **G** - Sessions actives (composant complet)
6. **J** - Favoris avec panier (composant complet)
7. **C** - Detail commande avec facture PDF (composant complet)

### Phase 2 - Features avec backend a completer

8. **L** - Codes promo (effort minimal, 1 select + 1 ligne UI)
9. **D** - Remboursements (effort faible, modifier select + 1 composant)
10. **F** - Filtres commandes (effort faible, enrichir params existants)
11. **K** - Annulation commande (effort moyen, action + composant + dialog)
12. **H** - Avatar (effort moyen, nouvelle route UploadThing)
13. **I** - Email (effort moyen, depend de Better Auth + impacts Stripe/newsletter)
14. **M** - Annulation suppression (effort moyen, depend de la decision sur le flux)
