# Spec technique - Espace client Synclune

> Ce document detaille les 10 fonctionnalites manquantes (A-J) + la mise a jour de la navigation, avec pour chaque item : les fichiers a creer/modifier, les patterns a suivre, les donnees disponibles, et les dependances.

---

## Navigation transversale

### Fichier a modifier

`modules/users/components/account-nav.tsx`

### Modifications

Ajouter 2 entrees au tableau `navItems` :

```ts
import { Heart, LayoutDashboard, MapPin, MessageSquare, Package, Settings, Sparkles } from "lucide-react";

const navItems = [
  { href: "/compte", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/commandes", label: "Commandes", icon: Package },
  { href: "/mes-avis", label: "Mes avis", icon: MessageSquare },
  { href: "/favoris", label: "Favoris", icon: Heart },
  { href: "/adresses", label: "Adresses", icon: MapPin },         // NEW
  { href: "/mes-demandes", label: "Mes demandes", icon: Sparkles }, // NEW
  { href: "/parametres", label: "Parametres", icon: Settings },
];
```

### Attention mobile

La bottom bar affiche actuellement 5 items. Avec 7, il faudra soit :
- Garder 5 items en mobile (retirer Adresses et Mes demandes de la bottom bar, accessibles seulement via sidebar desktop et liens dans le dashboard)
- Passer a un scroll horizontal ou un menu "Plus"

**Recommandation** : filtrer `navItems` en mobile pour n'afficher que les 5 items principaux. Les 2 nouveaux items restent accessibles via la sidebar desktop et le tableau de bord.

---

## A - Page adresses (`/adresses`)

### Statut actuel

- **Backend** : complet (actions CRUD, data fetcher, schemas, hooks)
- **Composants** : complets (`AddressList`, `AddressCard`, `AddressFormDialog`, `DeleteAddressAlertDialog`, `AddressListSkeleton`, `CreateAddressButton`, `AddressCardActions`)
- **Page** : redirige vers `/compte` (`redirect("/compte")`)

### Fichier a modifier

`app/(boutique)/(espace-client)/adresses/page.tsx`

### Pattern a suivre

Suivre le pattern des autres pages espace-client (cf. `/favoris/page.tsx`, `/commandes/page.tsx`).

### Donnees disponibles

| Source | Fonction | Return type |
|---|---|---|
| `modules/addresses/data/get-user-addresses.ts` | `getUserAddresses()` | `Promise<UserAddress[] \| null>` |
| `modules/addresses/actions/search-address.ts` | `searchAddress(params)` | `Promise<SearchAddressReturn>` |

### Structure de la page

```tsx
// app/(boutique)/(espace-client)/adresses/page.tsx
import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import { AddressList } from "@/modules/addresses/components/address-list";
import { AddressListSkeleton } from "@/modules/addresses/components/address-list-skeleton";
import { AddressFormDialog } from "@/modules/addresses/components/address-form-dialog";
import { DeleteAddressAlertDialog } from "@/modules/addresses/components/delete-address-alert-dialog";
import { getUserAddresses } from "@/modules/addresses/data/get-user-addresses";
import { searchAddress } from "@/modules/addresses/actions/search-address";
import { Suspense } from "react";

export default async function AddressesPage({ searchParams }) {
  const params = await searchParams;
  const addressesPromise = getUserAddresses();

  // Autocomplete suggestions from BAN API (triggered by ?q= param)
  const query = params.q;
  const addressSuggestions = query?.length >= 3
    ? await searchAddress({ text: query, maximumResponses: 5 })
    : [];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Mes adresses"
        description="Gerez vos adresses de livraison"
        breadcrumbs={[
          { label: "Mon compte", href: "/compte" },
          { label: "Adresses", href: "/adresses" },
        ]}
      />
      <section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<AddressListSkeleton />}>
            <AddressList addressesPromise={addressesPromise} />
          </Suspense>
        </div>
      </section>
      {/* Dialogs (uses dialog store provider from layout) */}
      <AddressFormDialog addressSuggestions={addressSuggestions} />
      <DeleteAddressAlertDialog />
    </div>
  );
}
```

### Providers requis

Les composants `AddressCardActions`, `CreateAddressButton`, et `AddressFormDialog` utilisent :
- `useDialog(ADDRESS_DIALOG_ID)` → `DialogStoreProvider`
- `useAlertDialog(DELETE_ADDRESS_DIALOG_ID)` → `AlertDialogStoreProvider`

Verifier que ces providers sont dans l'arbre de composants (probablement dans le layout boutique). Si non, les ajouter dans le layout espace-client.

### Fichiers connexes (aucun a creer)

| Fichier | Role |
|---|---|
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

### Fichiers a creer

| Fichier | Contenu |
|---|---|
| `app/(boutique)/(espace-client)/adresses/loading.tsx` | Skeleton avec `AddressListSkeleton` |

---

## B - Suivi des demandes de personnalisation (`/mes-demandes`)

### Statut actuel

- **Schema** : `CustomizationRequest` avec `userId`, `status`, `adminNotes`, `respondedAt`, index `@@index([userId, status])`
- **Backend admin** : complet (listing, detail, actions update status/notes)
- **Frontend client** : rien (formulaire public sur `/personnalisation`, mais pas de suivi)

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

### Fichiers a creer

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/mes-demandes/page.tsx` | Page listant les demandes |
| `app/(boutique)/(espace-client)/mes-demandes/loading.tsx` | Skeleton |
| `modules/customizations/data/get-user-customization-requests.ts` | Data fetcher filtre par `userId` |
| `modules/customizations/components/customer/customization-request-list.tsx` | Liste des demandes |
| `modules/customizations/components/customer/customization-request-card.tsx` | Carte individuelle |

### Data fetcher a creer

```ts
// modules/customizations/data/get-user-customization-requests.ts
// Pattern : wrapper session + fetchable cachee (cf. get-user-addresses.ts)

export async function getUserCustomizationRequests() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return fetchUserCustomizationRequests(session.user.id);
}

async function fetchUserCustomizationRequests(userId: string) {
  "use cache: private";
  cacheLife("dashboard");
  cacheTag(/* new tag */);

  return prisma.customizationRequest.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      createdAt: true,
      productTypeLabel: true,
      details: true,
      status: true,
      respondedAt: true,
      // adminNotes: DECISION REQUISE - montrer au client ou non?
      inspirationProducts: {
        select: {
          id: true,
          title: true,
          slug: true,
          skus: {
            where: { isDefault: true },
            select: { images: { take: 1, select: { url: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
```

### Constants

Reutiliser les constantes existantes :
- `modules/customizations/constants/status.constants.ts` : `CUSTOMIZATION_STATUS_LABELS`, `CUSTOMIZATION_STATUS_COLORS`
- `modules/customizations/constants/cache.ts` : ajouter un nouveau tag pour le cache user

### UI de la carte

Chaque carte affiche :
- Type de produit (`productTypeLabel`)
- Date de creation
- Badge de statut (couleurs existantes dans `CUSTOMIZATION_STATUS_COLORS`)
- Date de reponse si `respondedAt` non null
- Miniatures des produits d'inspiration (optionnel)
- Extrait de la description (truncate `details`)

### Decision requise

`adminNotes` est prevu comme "notes internes admin". Faut-il :
1. Le rendre visible au client (renommer en "reponse") ?
2. Ajouter un champ `clientResponse` separe ?
3. Le garder interne et ne montrer que le statut ?

---

## C - Facture PDF

### Statut actuel

- Commentaires `// ROADMAP: Invoices` dans :
  - `app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx` (ligne 9, 126)
  - `modules/orders/constants/order.constants.ts` (lignes 27, 62-63, 93)
  - `modules/orders/constants/user-orders.constants.ts` (ligne 23)
- Aucune implementation

### Approche recommandee

Generer le PDF cote serveur via une route API (`app/api/orders/[orderNumber]/invoice/route.ts`) qui :
1. Verifie l'authentification (session user ou admin)
2. Recupere les donnees de la commande
3. Genere un PDF avec les informations legales
4. Retourne le fichier en `application/pdf`

### Dependance a ajouter

```bash
pnpm add @react-pdf/renderer
# OU
pnpm add jspdf
# OU utiliser une approche HTML → PDF via puppeteer/playwright (lourd pour Vercel)
```

**Recommandation** : `@react-pdf/renderer` pour rester dans l'ecosysteme React, ou `jspdf` pour une approche plus legere.

### Fichiers a creer

| Fichier | Role |
|---|---|
| `app/api/orders/[orderNumber]/invoice/route.ts` | Route API GET → PDF |
| `modules/orders/services/generate-invoice-pdf.ts` | Service de generation du PDF |
| `modules/orders/components/customer/download-invoice-button.tsx` | Bouton de telechargement |

### Fichier a modifier

`app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx` : ajouter `<DownloadInvoiceButton>` dans la sidebar (a l'emplacement du commentaire ROADMAP ligne 126).

### Donnees necessaires pour la facture

Toutes disponibles via `GET_ORDER_SELECT` existant :
- `orderNumber`, `createdAt`
- `customerName`, `customerEmail`
- `shippingFirstName`, `shippingLastName`, etc. (adresse)
- `items[]` avec `productTitle`, `price`, `quantity`
- `subtotal`, `discountAmount`, `shippingCost`, `taxAmount`, `total`
- `currency`

### Informations legales a inclure (micro-entreprise)

- Numero de commande comme reference facture
- Mention "TVA non applicable, art. 293 B du CGI"
- Coordonnees de l'entreprise (a externaliser en constants)
- Date de facturation = date de paiement (`paidAt`)

### Condition d'affichage

Le bouton ne s'affiche que si `order.paymentStatus === "PAID"` (pas de facture pour commandes non payees).

### Route API

```ts
// app/api/orders/[orderNumber]/invoice/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  // 1. Auth check (session user ou admin)
  // 2. getOrder({ orderNumber }) avec verification userId
  // 3. Verifier paymentStatus === "PAID"
  // 4. Generer le PDF via le service
  // 5. Return new Response(pdfBuffer, {
  //      headers: {
  //        "Content-Type": "application/pdf",
  //        "Content-Disposition": `attachment; filename="facture-${orderNumber}.pdf"`,
  //      },
  //    });
}
```

---

## D - Historique des remboursements

### Statut actuel

- **Schema** : `Refund` et `RefundItem` existent avec toutes les relations
- **Backend admin** : actions de creation/gestion de remboursements implementees
- **Frontend client** : rien

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
| `app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx` | Ajouter `<OrderRefundsCard>` |

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

### Constants a creer

```ts
// modules/orders/constants/refund.constants.ts (ou payments/)
export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  CUSTOMER_REQUEST: "Demande client",
  DEFECTIVE: "Produit defectueux",
  WRONG_ITEM: "Erreur de commande",
  LOST_IN_TRANSIT: "Colis perdu",
  FRAUD: "Fraude",
  OTHER: "Autre",
};

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuve",
  COMPLETED: "Rembourse",
  REJECTED: "Refuse",
  FAILED: "Echoue",
  CANCELLED: "Annule",
};
```

---

## E - Gestion newsletter dans les parametres

### Statut actuel

- **Data** : `getSubscriptionStatus()` dans `modules/newsletter/data/get-subscription-status.ts` retourne `{ isSubscribed, email, emailVerified }`
- **Actions** : `subscribeToNewsletter` et `unsubscribeFromNewsletter` existent
- **Schema** : `NewsletterSubscriber` lie a `User` via `userId` (optional, unique)
- **UI** : formulaire en footer, pas dans l'espace client

### Fichiers a creer

| Fichier | Role |
|---|---|
| `modules/newsletter/components/newsletter-settings-card.tsx` | Carte toggle on/off |

### Fichier a modifier

`app/(boutique)/(espace-client)/parametres/page.tsx` : ajouter la carte dans la sidebar (1/3), entre Session et RGPD.

### Donnees disponibles

```ts
// Deja existant
import { getSubscriptionStatus } from "@/modules/newsletter/data/get-subscription-status";
const status = await getSubscriptionStatus();
// → { isSubscribed: boolean, email: string | null, emailVerified: boolean }
```

### Pattern du composant

```tsx
// modules/newsletter/components/newsletter-settings-card.tsx
// Client component avec useActionState

// Si inscrit → bouton "Se desinscrire" (appelle unsubscribeFromNewsletter)
// Si non inscrit → bouton "S'inscrire" (appelle subscribeToNewsletter)
// Afficher le statut actuel
```

### Attention

L'action `unsubscribeFromNewsletter` existante attend un `formData` avec `email` et optionnellement `token`. Pour le cas espace client (utilisateur connecte), passer l'email depuis le props et ne pas utiliser le token (le fallback email-only est supporte).

L'action `subscribeToNewsletter` a une logique complete (double opt-in, Arcjet). Pour l'espace client, on peut creer une variante interne (`subscribeToNewsletterInternal` existe deja dans `modules/newsletter/actions/subscribe-to-newsletter-internal.ts`) qui bypass certaines verifications puisque l'utilisateur est deja authentifie.

---

## F - Filtrage/recherche des commandes

### Statut actuel

- **Params prevus** : `filter_status` et `filter_fulfillmentStatus` sont dans le type `CustomerOrdersSearchParams` (page commandes)
- **Backend** : non implemente (les params ne sont pas passes a `getUserOrders`)
- **UI** : absente

### Fichiers a modifier

| Fichier | Modification |
|---|---|
| `app/(boutique)/(espace-client)/commandes/page.tsx` | Ajouter parsing des filtres + passer a `getUserOrders` |
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

---

## G - Sessions actives

### Statut actuel

- **Schema** : `Session` avec `ipAddress`, `userAgent`, `expiresAt`, `createdAt`
- **Better Auth** : pas de `listSessions` ou `revokeSession` configure
- **UI** : le formulaire de changement de mot de passe a une option "Revoquer les autres sessions" mais pas de listing

### Approche

Better Auth supporte `auth.api.listSessions()` et `auth.api.revokeSession()` via son API serveur.

### Fichiers a creer

| Fichier | Role |
|---|---|
| `modules/users/data/get-user-sessions.ts` | Data fetcher pour les sessions actives |
| `modules/users/actions/revoke-session.ts` | Server action pour revoquer une session |
| `modules/users/components/active-sessions-card.tsx` | Carte listant les sessions |

### Fichier a modifier

`app/(boutique)/(espace-client)/parametres/page.tsx` : ajouter `<ActiveSessionsCard>` dans la colonne principale (2/3).

### Data fetcher

```ts
// modules/users/data/get-user-sessions.ts
export async function getUserSessions() {
  const session = await getSession();
  if (!session?.user?.id) return [];

  return prisma.session.findMany({
    where: {
      userId: session.user.id,
      expiresAt: { gt: new Date() }, // Non expirees
    },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
```

### UI

Chaque session affiche :
- Icone appareil (parser `userAgent` : desktop/mobile/tablet)
- Navigateur + OS (parser `userAgent`)
- Adresse IP (masquee partiellement pour securite)
- Date de connexion
- Badge "Session actuelle" pour la session en cours
- Bouton "Revoquer" (sauf session actuelle)

### Parsing du User-Agent

Utiliser `ua-parser-js` (legere, populaire) ou parser manuellement les cas courants.

---

## H - Upload d'avatar

### Statut actuel

- **Schema** : `User.image` existe (`String? @db.VarChar(2048)`)
- **Upload** : UploadThing configure avec 4 routes (`testimonialMedia`, `catalogMedia`, `contactAttachment`, `reviewMedia`)
- **UI** : aucune

### Fichiers a creer

| Fichier | Role |
|---|---|
| `modules/users/components/avatar-upload.tsx` | Composant upload + preview |
| `modules/users/actions/update-avatar.ts` | Server action pour mettre a jour `User.image` |

### Fichier a modifier

| Fichier | Modification |
|---|---|
| `app/api/uploadthing/core.ts` | Ajouter route `avatarMedia` |
| `app/(boutique)/(espace-client)/parametres/page.tsx` | Ajouter `<AvatarUpload>` dans la carte profil |
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

- Cercle avec avatar actuel (ou initiales si pas d'image)
- Bouton "Modifier" overlay au hover
- Preview avant upload
- Bouton "Supprimer" si image existante (set `User.image` a null)

---

## I - Modification d'email

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

### Attention

- Verifier que Better Auth supporte `changeEmail` dans la version utilisee
- Si non supporte, implementer manuellement :
  1. Creer un token de verification
  2. Envoyer un email a la nouvelle adresse
  3. Sur confirmation, mettre a jour `User.email` et `emailVerified`
  4. Mettre a jour l'email dans Stripe (`stripeCustomerId`)

---

## J - Ajouter au panier depuis la wishlist

### Statut actuel

- **Wishlist** : affiche des `ProductCard` dans une grille
- **ProductCard** : pas de bouton "Ajouter au panier" (c'est un lien vers la page produit)
- **addToCart** : action existante qui attend `{ skuId, quantity }` via FormData
- **Wishlist data** : inclut les SKUs avec `id`, `inventory`, `isActive`, `priceInclTax`

### Complexite

Un produit peut avoir plusieurs SKUs (couleur/taille/matiere). Le bouton "Ajouter au panier" depuis la wishlist doit gerer :

**Cas 1 - Produit mono-SKU** : ajouter directement le SKU par defaut
**Cas 2 - Produit multi-SKU** : ouvrir un selecteur de variante ou rediriger vers la page produit

### Approche recommandee

Ajouter un bouton "Ajouter au panier" sur chaque `ProductCard` dans le contexte wishlist :
- Si 1 seul SKU actif → ajout direct (appel `addToCart` avec le `skuId`)
- Si multi-SKU → redirection vers la page produit (`/creations/[slug]`)

### Fichiers a creer

| Fichier | Role |
|---|---|
| `modules/wishlist/components/wishlist-add-to-cart-button.tsx` | Bouton conditionnel |

### Fichier a modifier

`modules/wishlist/components/wishlist-list-content.tsx` : ajouter le bouton sous chaque `ProductCard`, ou creer un wrapper `WishlistProductCard`.

### Donnees disponibles

Le `GET_WISHLIST_SELECT` inclut deja tout ce qu'il faut :
```ts
product.skus[]: { id, sku, priceInclTax, inventory, isActive, isDefault, color, material, size, images }
```

### Implementation du bouton

```tsx
// modules/wishlist/components/wishlist-add-to-cart-button.tsx
"use client";

function WishlistAddToCartButton({ product }) {
  const activeSkus = product.skus.filter(sku => sku.isActive && sku.inventory > 0);

  if (activeSkus.length === 0) {
    return <Badge variant="secondary">Rupture de stock</Badge>;
  }

  if (activeSkus.length === 1) {
    // Ajout direct - formulaire avec hidden skuId
    return (
      <form action={addToCartAction}>
        <input type="hidden" name="skuId" value={activeSkus[0].id} />
        <input type="hidden" name="quantity" value="1" />
        <Button type="submit" size="sm" variant="outline">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Ajouter au panier
        </Button>
      </form>
    );
  }

  // Multi-SKU → lien vers page produit
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={`/creations/${product.slug}`}>
        Choisir une variante
      </Link>
    </Button>
  );
}
```

---

## Dependances entre fonctionnalites

```
Navigation ← A (adresses) + B (mes demandes)
C (facture PDF) ← nouvelle dependance npm
D (remboursements) ← modifier GET_ORDER_SELECT
E (newsletter) ← aucune
F (filtres commandes) ← modifier schema + data fetcher
G (sessions) ← aucune (ou ua-parser-js)
H (avatar) ← modifier UploadThing core + user select
I (email) ← verifier Better Auth changeEmail
J (panier wishlist) ← aucune
```

## Ordre d'implementation suggere

1. **A** - Adresses (effort faible, tout existe)
2. **Navigation** - Ajouter les 2 nouvelles routes
3. **E** - Newsletter settings (effort faible)
4. **D** - Remboursements (effort faible, modifier select + 1 composant)
5. **F** - Filtres commandes (effort faible, enrichir params existants)
6. **J** - Panier wishlist (effort faible)
7. **B** - Demandes personnalisation (effort moyen, data fetcher + composants)
8. **G** - Sessions actives (effort faible)
9. **H** - Avatar (effort moyen, nouvelle route UploadThing)
10. **C** - Facture PDF (effort moyen, dependance npm + service generation)
11. **I** - Email (effort moyen, depend de Better Auth)
