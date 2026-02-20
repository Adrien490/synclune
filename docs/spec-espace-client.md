# Spec technique - Espace client Synclune

> Ce document detaille les fonctionnalites de l'espace client (A-M) + la navigation, avec pour chaque item : le statut d'implementation, les fichiers a creer/modifier, les patterns a suivre, les donnees disponibles, et les dependances.

---

## Tableau de suivi

| Feature | Statut | Effort | Notes |
|---|---|---|---|
| Navigation (7 items) | Fait | - | Avec `desktopOnly` pour Adresses + Demandes |
| A - Adresses | Fait | - | BAN autocomplete inclus |
| B - Mes demandes | Fait | - | Page + composants customer |
| C - Facture PDF | Fait | - | `DownloadInvoiceButton` + route API |
| D - Remboursements | A faire | Faible | Modifier `GET_ORDER_SELECT` + 1 composant |
| E - Newsletter settings | Fait | - | `NewsletterSettingsCard` dans sidebar parametres |
| F - Filtres commandes | A faire | Faible | Params types mais pas wires |
| G - Sessions actives | Fait | - | `ActiveSessionsCard` dans parametres |
| H - Avatar upload | A faire | Moyen | Nouvelle route UploadThing + composant |
| I - Changement email | A faire | Moyen | Email toujours read-only dans `ProfileForm` |
| J - Panier wishlist | A faire | Faible | Pas de bouton ajout panier depuis wishlist |
| K - Annulation commande client | A faire | Moyen | `cancelOrder` est admin-only actuellement |
| L - Codes promo sur commande | A faire | Faible | `discountAmount` affiche mais pas le code |
| M - Annulation suppression compte | A faire | Moyen | `PENDING_DELETION` non utilise, suppression immediate |

---

## Navigation transversale

> **Statut : Fait**

### Fichier modifie

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

> **Statut : Fait**

### Statut actuel

- **Backend** : complet (actions CRUD, data fetcher, schemas, hooks)
- **Composants** : complets (`AddressList`, `AddressCard`, `AddressFormDialog`, `DeleteAddressAlertDialog`, `AddressListSkeleton`, `CreateAddressButton`, `AddressCardActions`)
- **Page** : implementee avec autocomplete BAN

### Donnees disponibles

| Source | Fonction | Return type |
|---|---|---|
| `modules/addresses/data/get-user-addresses.ts` | `getUserAddresses()` | `Promise<UserAddress[] \| null>` |
| `modules/addresses/actions/search-address.ts` | `searchAddress(params)` | `Promise<SearchAddressReturn>` |

### Fichiers

| Fichier | Role |
|---|---|
| `app/(boutique)/(espace-client)/adresses/page.tsx` | Page principale |
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

> **Statut : Fait**

### Statut actuel

- **Schema** : `CustomizationRequest` avec `userId`, `status`, `adminNotes`, `respondedAt`, index `@@index([userId, status])`
- **Backend admin** : complet (listing, detail, actions update status/notes)
- **Frontend client** : page + composants implementes

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
| `app/(boutique)/(espace-client)/mes-demandes/page.tsx` | Page listant les demandes |
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

> **Statut : Fait**

### Implementation actuelle

- `DownloadInvoiceButton` dans la page detail commande
- Route API pour la generation du PDF
- Condition : affiche uniquement si `order.paymentStatus === "PAID"`

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

> **Statut : A faire**

### Statut actuel

- **Schema** : `Refund` et `RefundItem` existent avec toutes les relations
- **Backend admin** : actions de creation/gestion de remboursements implementees
- **Data admin** : `get-order-refunds.ts` existe mais appelle `requireAdmin()` (inaccessible client)
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
- `REFUND_STATUS_COLORS` : couleurs par statut (amber, blue, green, red, gray)

Ne pas creer de doublons dans `modules/orders/`.

### Gestion d'erreur

Pas d'erreur specifique attendue (lecture seule). Si le fetch echoue, la carte ne s'affiche pas (graceful degradation).

### Empty state

Pas d'empty state necessaire : la carte ne s'affiche que si `refunds.length > 0`.

---

## E - Gestion newsletter dans les parametres

> **Statut : Fait**

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

> **Statut : A faire** (tri implemente, filtres non)

### Statut actuel

- **Schema actuel** : `user-orders.schemas.ts` ne contient que `cursor`, `direction`, `perPage`, `sortBy` - aucun champ de filtre n'est defini
- **Tri** : implemente via `SortSelect` avec 4 options
- **Backend** : `fetch-user-orders.ts` hardcode `paymentStatus: PaymentStatus.PAID` sans filtres supplementaires
- **UI filtres** : absente

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

> **Statut : Fait**

### Implementation actuelle

- `ActiveSessionsCard` dans la page parametres
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

> **Statut : A faire**

### Statut actuel

- **Schema** : `User.image` existe (`String? @db.VarChar(2048)`)
- **Upload** : UploadThing configure avec 4 routes (`testimonialMedia`, `catalogMedia`, `contactAttachment`, `reviewMedia`)
- **UI** : aucune
- **Fallback existant** : l'UI affiche deja les initiales de l'utilisateur quand `User.image` est null (verifier dans les composants de header/nav)

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

> **Statut : A faire**

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

> **Statut : A faire**

### Statut actuel

- **Wishlist** : affiche des `ProductCard` dans une grille
- **ProductCard** : pas de bouton "Ajouter au panier" (c'est un lien vers la page produit)
- **addToCart** : action existante qui attend `{ skuId, quantity }` via FormData
- **Wishlist data** : inclut les SKUs avec `id`, `inventory`, `isActive`, `priceInclTax`
- **Badge counts** : le store `useBadgeCountsStore` n'est utilise que dans la navbar storefront, pas dans la nav espace-client

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

## K - Annulation de commande par le client

> **Statut : A faire** (nouvelle feature)

### Contexte

Le schema supporte `OrderStatus.CANCELLED`, `OrderAction.CANCELLED`, et `OrderHistory` pour tracer les changements de statut. L'action `cancelOrder` existante (`modules/orders/actions/cancel-order.ts`) appelle `requireAdminWithUser()` et est donc inaccessible aux clients.

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
| `app/(boutique)/(espace-client)/commandes/[orderNumber]/page.tsx` | Ajouter `<CancelOrderButton>` conditionnel |

### Server action

```ts
// modules/orders/actions/cancel-order-customer.ts
"use server"

import { createOrderAuditTx } from "@/modules/orders/utils/order-audit"

export async function cancelOrderCustomer(
  _: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth()
  if ("error" in user) return user.error

  const validation = validateInput(schema, { orderNumber: formData.get("orderNumber") })
  if (!validation.success) return error(validation.error.errors[0]?.message)

  // Verifier que la commande appartient au user ET est PENDING
  const order = await prisma.order.findFirst({
    where: {
      orderNumber: validation.data.orderNumber,
      userId: user.id,
      status: "PENDING",
      deletedAt: null,
    },
    select: { id: true, orderNumber: true, status: true },
  })
  if (!order) return notFound("Commande introuvable ou non annulable")

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    })

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

  updateTag("orders-list")
  updateTag(`order-${order.orderNumber}`)
  return success("Commande annulee")
}
```

### UI

- Le bouton "Annuler la commande" s'affiche uniquement si `order.status === "PENDING"`
- Un `AlertDialog` de confirmation demande "Etes-vous sur de vouloir annuler cette commande ? Cette action est irreversible."
- Apres annulation, la page se rafraichit et le statut passe a `CANCELLED`

### Gestion d'erreur

- Commande pas trouvee ou plus PENDING (race condition) : message "Cette commande ne peut plus etre annulee"
- Erreur serveur : toast generique avec retry

---

## L - Codes promo affiches sur commande

> **Statut : A faire** (nouvelle feature)

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

> **Statut : A faire** (nouvelle feature)

### Contexte

Le schema Prisma prevoit un flux de suppression en 2 etapes :
- `User.accountStatus` : `ACTIVE` | `INACTIVE` | `PENDING_DELETION` | `ANONYMIZED`
- `User.deletionRequestedAt` : date de la demande

Mais l'implementation actuelle (`modules/users/actions/delete-account.ts`) **bypass completement** l'etat `PENDING_DELETION` et anonymise immediatement le compte en une transaction. Il n'y a pas de periode de grace.

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
F (filtres commandes) ← modifier schema + data fetcher
H (avatar) ← modifier UploadThing core + user select
I (email) ← verifier Better Auth changeEmail + impacts Stripe/newsletter
J (panier wishlist) ← aucune
K (annulation commande) ← creer action client + composant
L (codes promo) ← modifier GET_ORDER_SELECT + OrderSummaryCard
M (annulation suppression) ← decision sur le flux de suppression (immediat vs differe)
```

## Ordre d'implementation suggere

Features restantes uniquement :

1. **L** - Codes promo (effort minimal, 1 select + 1 ligne UI)
2. **D** - Remboursements (effort faible, modifier select + 1 composant)
3. **F** - Filtres commandes (effort faible, enrichir params existants)
4. **J** - Panier wishlist (effort faible, 1 composant)
5. **K** - Annulation commande (effort moyen, action + composant + dialog)
6. **H** - Avatar (effort moyen, nouvelle route UploadThing)
7. **I** - Email (effort moyen, depend de Better Auth + impacts Stripe/newsletter)
8. **M** - Annulation suppression (effort moyen, depend de la decision sur le flux)

### Note sur les features existantes

Les features suivantes sont deja implementees et fonctionnelles : Navigation, A (Adresses), B (Mes demandes), C (Facture PDF), E (Newsletter), G (Sessions). Les reponses admin aux avis (`ReviewResponse`) sont egalement visibles dans `UserReviewCard`.
