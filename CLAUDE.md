# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synclune is a French artisanal jewelry e-commerce platform built with Next.js 16 App Router, React 19, and TypeScript. It features:
- **Customer storefront** (`/boutique`) - Product browsing, cart, checkout, order tracking
- **Admin dashboard** (`/admin`) - Inventory, orders, analytics, user management
- **Stripe integration** - Payments, invoices, refunds, webhooks
- **Email system** - Transactional emails (orders, shipping, refunds) + newsletter

## Common Commands

```bash
# Development
pnpm dev              # Start development server (localhost:3000)
pnpm build            # Build for production (runs prisma generate first)
pnpm lint             # Run ESLint

# Testing
pnpm test             # Run tests with Vitest
pnpm test:watch       # Watch mode
pnpm test:ui          # Interactive UI
pnpm test:coverage    # Coverage report

# Database
pnpm prisma generate  # Regenerate Prisma client
pnpm prisma migrate dev  # Create/apply migrations
pnpm prisma studio    # Open database GUI
pnpm seed             # Seed database

# Email development
pnpm email:dev        # Preview emails on port 3001
```

## Directory Structure

```
app/
├── (auth)/           # Authentication (connexion, inscription, mot-de-passe-oublie, etc.)
├── (boutique)/       # Customer storefront
│   ├── (accueil)/    # Homepage
│   ├── (espace-client)/ # Protected user area (commandes, favoris, compte, etc.)
│   ├── (informations-legales)/ # Legal pages (cgv, confidentialite, etc.)
│   ├── creations/[slug]/ # Product detail pages
│   ├── produits/     # Product listing with filters
│   ├── collections/  # Collections pages
│   ├── panier/       # Shopping cart
│   └── paiement/     # Checkout flow
├── admin/            # Admin dashboard (protected, ADMIN role required)
│   ├── catalogue/    # Products, colors, materials, collections, types
│   ├── ventes/       # Orders, refunds
│   ├── marketing/    # Newsletter, stock notifications, promo codes
│   └── utilisateurs/ # User management
└── api/              # API routes
    ├── auth/[...all]/ # Better Auth handler
    ├── webhooks/stripe/ # Stripe webhooks (idempotent)
    ├── uploadthing/  # File uploads
    └── invoices/     # PDF invoice download

modules/              # Domain-driven business logic (DDD)
shared/               # Cross-cutting concerns (components, lib, utils, hooks, stores)
prisma/               # Database schema and migrations
emails/               # React Email templates
```

## Module Structure

Each module in `modules/` follows a consistent pattern:
- `actions/` - Server Actions ("use server")
- `data/` - Data fetching functions with caching
- `components/` - Module-specific React components
- `schemas/` - Zod validation schemas
- `types/` - TypeScript types
- `constants/` - Module constants and cache config
- `utils/` - Module utilities
- `services/` - Complex business logic (optional)
- `lib/` - Module-specific libraries (optional)
- `hooks/` - Client-side hooks (optional)

**Complete module list (22 modules):**

| Module | Purpose |
|--------|---------|
| `auth` | Authentication, sessions, verification, password reset |
| `users` | User management, profiles, RGPD data export |
| `addresses` | User shipping/billing addresses |
| `cart` | Shopping cart (authenticated + guest sessions) |
| `wishlist` | Favorites/wishlist functionality |
| `products` | Product catalog, search, filtering |
| `skus` | SKU/variant management, pricing, inventory |
| `collections` | Product collections/categories |
| `colors` | Color attributes |
| `materials` | Material attributes |
| `product-types` | Product type definitions (rings, necklaces, etc.) |
| `customizations` | Custom jewelry requests |
| `orders` | Order management, fulfillment, tracking |
| `payments` | Stripe checkout, payment processing |
| `refunds` | Refund processing and management |
| `discounts` | Promo codes, discount management |
| `newsletter` | Newsletter subscriptions (double opt-in) |
| `stock-notifications` | Back-in-stock alerts |
| `dashboard` | Admin analytics, KPIs, charts |
| `medias` | Image/video management (UploadThing) |
| `webhooks` | Stripe webhook handlers |

## Key Technologies

- **Auth**: Better Auth with email/password, Google OAuth, GitHub OAuth
- **Database**: PostgreSQL via Prisma 7 ORM (Neon adapter)
- **Payments**: Stripe (checkout sessions, webhooks, invoices, refunds)
- **File uploads**: UploadThing
- **Forms**: TanStack Form with custom `useAppForm` hook
- **State**: Zustand for client state (dialogs, cookie consent)
- **Emails**: React Email + Resend
- **Rate Limiting**: Arcjet
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion animations

## Server Actions Pattern

All mutations use Server Actions with a standardized pattern:

```typescript
"use server"

import { revalidateTag } from "next/cache"
import { requireAdmin, validateInput, success, error, handleActionError } from "@/shared/lib/actions"
import { prisma } from "@/shared/lib/prisma"
import { mySchema } from "../schemas/my.schemas"
import { MY_CACHE_TAGS, getMyInvalidationTags } from "../constants/cache"

export async function createSomething(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  // 1. Auth check (discriminated union pattern)
  const admin = await requireAdmin()
  if ("error" in admin) return admin.error

  // 2. Extract and validate input
  const rawData = {
    name: formData.get("name") as string,
    price: Number(formData.get("price")),
  }

  const validation = validateInput(mySchema, rawData)
  if (!validation.success) {
    return error(validation.error.errors[0]?.message || "Validation failed")
  }

  try {
    // 3. Business logic
    const result = await prisma.model.create({
      data: validation.data,
    })

    // 4. Cache invalidation
    const tags = getMyInvalidationTags(result.id)
    await Promise.all(tags.map(tag => revalidateTag(tag)))

    return success("Element cree avec succes", { id: result.id })
  } catch (e) {
    return handleActionError(e, "Erreur lors de la creation")
  }
}
```

**Response helpers** (`shared/lib/actions/responses.ts`):
- `success(message, data?)` - ActionStatus.SUCCESS
- `error(message, status?)` - ActionStatus.ERROR (default)
- `notFound(resource)` - ActionStatus.NOT_FOUND (auto-pluralizes French)
- `conflict(message)` - ActionStatus.CONFLICT
- `unauthorized(message?)` - ActionStatus.UNAUTHORIZED
- `forbidden(message?)` - ActionStatus.FORBIDDEN
- `validationError(message)` - ActionStatus.VALIDATION_ERROR

**Auth helpers** (`shared/lib/actions/auth.ts`):
- `requireAuth()` - Returns `{ user }` or `{ error: ActionState }`
- `requireAdmin()` - Returns `{ user }` or `{ error: ActionState }`

## Data Fetching & Caching

### Cache Directives
- `"use cache"` - Public shared data (products, collections, colors)
- `"use cache: private"` - Per-user data (cart, wishlist, addresses)
- `"use cache: remote"` - After `await connection()` for dashboard (aggregates)

### Cache Life Profiles (next.config.ts)

| Profile | Stale | Revalidate | Expire | Used For |
|---------|-------|-----------|--------|----------|
| `products` | 15m | 5m | 6h | Product lists, searches |
| `collections` | 1h | 15m | 1d | Collection pages |
| `reference` | 7d | 1d | 30d | Colors, materials, types |
| `productDetail` | 15m | 5m | 6h | Single product pages |
| `dashboard` | 1m | 30s | 5m | Admin KPIs, charts |
| `changelog` | 1d | 1h | 7d | Version history |

### Cache Configuration Pattern

Each module has `constants/cache.ts`:

```typescript
import { cacheLife, cacheTag } from "next/cache"

// 1. Cache tags (as const for type safety)
export const PRODUCTS_CACHE_TAGS = {
  LIST: "products-list",
  DETAIL: (slug: string) => `product-${slug}`,
  SKUS: (productId: string) => `product-${productId}-skus`,
  MAX_PRICE: "max-product-price",
} as const

// 2. Cache helper (apply in data functions)
export function cacheProducts() {
  cacheLife("products")
  cacheTag(PRODUCTS_CACHE_TAGS.LIST)
}

// 3. Invalidation helper (use in actions)
export function getProductInvalidationTags(slug?: string): string[] {
  const tags = [PRODUCTS_CACHE_TAGS.LIST, PRODUCTS_CACHE_TAGS.MAX_PRICE]
  if (slug) tags.push(PRODUCTS_CACHE_TAGS.DETAIL(slug))
  return tags
}
```

### Data Function Pattern

```typescript
import { cacheProducts, PRODUCTS_CACHE_TAGS } from "../constants/cache"

export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  "use cache"
  cacheProducts()

  return prisma.product.findMany({
    where: buildWhereClause(filters),
    select: PRODUCT_LIST_SELECT,
  })
}
```

## Forms Pattern

Use TanStack Form with custom `useAppForm` hook:

```typescript
"use client"

import { useAppForm } from "@/shared/components/forms/form-context"
import { InputField, SelectField } from "@/shared/components/forms"
import { FormLayout, FormFooter } from "@/shared/components/forms"
import { mySchema, type MyInput } from "@/modules/my-module/schemas/my.schemas"

export function MyForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useAppForm<MyInput>({
    defaultValues: { name: "", email: "" },
    validators: { onChange: mySchema },
    onSubmit: async ({ value }) => {
      const formData = new FormData()
      formData.set("name", value.name)
      formData.set("email", value.email)

      const result = await myAction(undefined, formData)
      if (result.status === ActionStatus.SUCCESS) {
        onSuccess?.()
      }
    },
  })

  return (
    <FormLayout>
      <form.AppField
        name="name"
        children={(field) => (
          <InputField field={field} label="Nom" placeholder="Entrez votre nom" />
        )}
      />
      <form.AppField
        name="email"
        children={(field) => (
          <InputField field={field} label="Email" type="email" />
        )}
      />
      <FormFooter>
        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Envoi..." : "Envoyer"}
            </Button>
          )}
        />
      </FormFooter>
    </FormLayout>
  )
}
```

## Hooks Pattern

Client hooks for Server Actions with toast feedback:

```typescript
"use client"

import { useActionState, useTransition } from "react"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { myServerAction } from "../actions/my-action"

interface UseMyActionOptions {
  onSuccess?: () => void
}

export function useMyAction(options?: UseMyActionOptions) {
  const [isPending, startTransition] = useTransition()

  const [state, action] = useActionState(
    withCallbacks(myServerAction, createToastCallbacks({
      loadingMessage: "Operation en cours...",
      onSuccess: options?.onSuccess,
    })),
    undefined
  )

  const handle = (data: MyInput) => {
    startTransition(() => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        formData.set(key, String(value))
      })
      action(formData)
    })
  }

  return { state, handle, isPending }
}
```

## State Management

### Zustand Stores (`shared/stores/`)

**Dialog Store** - Modal management with contextual data:
```typescript
import { useDialogStore } from "@/shared/stores/dialog-store"

// Open dialog with data
const { openDialog } = useDialogStore()
openDialog("edit-product", { productId: "123" })

// In dialog component
const { isDialogOpen, getDialogData, closeDialog } = useDialogStore()
const data = getDialogData<{ productId: string }>("edit-product")
```

**Alert Dialog Store** - Confirmation dialogs:
```typescript
import { useAlertDialogStore } from "@/shared/stores/alert-dialog-store"

const { openDialog } = useAlertDialogStore()
openDialog("delete-confirm", {
  title: "Supprimer ?",
  onConfirm: () => handleDelete()
})
```

**Cookie Consent Store** - RGPD cookie preferences

### URL State Hooks (`shared/hooks/`)

```typescript
// Filters with URL sync
const { setFilter, removeFilter, hasActiveFilters } = useFilter({
  filterPrefix: "filter_",
  preservePage: false,
})

// Pagination
const { page, perPage, handlePageChange, getPageNumbers } = usePagination()

// Multi-selection for batch operations
const { selectedItems, handleSelectionChange, clearAll } = useSelection()

// Cursor pagination for large datasets
const { cursor, hasMore, loadMore } = useCursorPagination()
```

## Action Helpers

`shared/lib/actions/` provides:

| File | Exports | Purpose |
|------|---------|---------|
| `responses.ts` | success, error, notFound, conflict, unauthorized, forbidden, validationError | Response builders |
| `auth.ts` | requireAuth, requireAdmin | Auth checks (discriminated union) |
| `validation.ts` | validateInput, validateFormData | Zod validation wrappers |
| `rate-limit.ts` | enforceRateLimit, getRateLimitId, enforceRateLimitForCurrentUser | Rate limiting |
| `errors.ts` | handleActionError, withErrorHandling | Error handling |
| `index.ts` | Re-exports all | Single import point |

## UI Components

### shadcn/ui Base (60+ components in `shared/components/ui/`)

**Forms**: Button, Input, Textarea, Select, Checkbox, RadioGroup, Toggle, Slider, DateTimePicker, ColorPicker

**Layout**: Card, Separator, Accordion, Collapsible, ScrollArea, Sidebar, Breadcrumb, Tabs

**Data**: Table, Pagination, Badge, Avatar, Skeleton, Empty

**Overlays**: Dialog, AlertDialog, DropdownMenu, Popover, Sheet, Tooltip, HoverCard

**Feedback**: Spinner, Sonner (toasts), Alert, Progress

### Custom Components

**Data Tables**:
- `DataTableToolbar` - Filters, search, column visibility
- `SelectionToolbar` - Bulk actions for selected items
- `TableScrollContainer` - Horizontal scrolling

**Filters**:
- `FilterSheet` - Mobile-friendly filter panel
- `FilterBadges` - Visual filter chips
- `DateRangeFilter`, `SelectFilter`, `SortSelect`

### Animations (`shared/components/animations/`)

Framer Motion components: Fade, Slide, Stagger, Reveal, Pulse, Hover, Tap, Presence

## Prisma Patterns

### Soft Deletes

10-year retention required for French accounting regulations:

```typescript
import { notDeleted, softDelete } from "@/shared/lib/prisma"

// In queries - exclude soft-deleted records
const orders = await prisma.order.findMany({
  where: { userId, ...notDeleted },
})

// In mutations - soft delete instead of hard delete
await softDelete.order(orderId)
await softDelete.user(userId)
await softDelete.refund(refundId)
```

### Data Snapshots

Order data is snapshotted at creation to preserve history:
- `shippingAddress`, `billingAddress` - JSON snapshots of addresses
- `OrderItem.productSnapshot`, `skuSnapshot` - Product/SKU state at order time
- `priceAtAdd` on CartItem/WishlistItem - Price tracking

### Key Enums

```typescript
enum ProductStatus { DRAFT, PUBLIC, ARCHIVED }
enum OrderStatus { PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED }
enum PaymentStatus { PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED }
enum RefundStatus { PENDING, APPROVED, REJECTED, COMPLETED, FAILED }
enum FulfillmentStatus { UNFULFILLED, PARTIALLY_FULFILLED, FULFILLED, RETURNED }
```

## API Routes

| Route | Purpose |
|-------|---------|
| `/api/auth/[...all]` | Better Auth handler (login, register, OAuth) |
| `/api/webhooks/stripe` | Stripe webhooks with signature verification + idempotency |
| `/api/uploadthing` | UploadThing file upload handler |
| `/api/invoices/[invoiceId]` | Fetch invoice from Stripe |
| `/api/invoices/[invoiceId]/download` | Download invoice PDF |
| `/api/cron/*` | Scheduled tasks |

### Stripe Webhook Idempotency

Webhooks use `WebhookEvent` model to prevent duplicate processing:
- 5-minute replay window
- `stripeEventId` as idempotency key
- Signature verification before processing

## Email System

### Templates (`emails/`)

**Transactional**:
- `order-confirmation-email.tsx` - Order placed
- `shipping-confirmation-email.tsx` - Order shipped
- `delivery-confirmation-email.tsx` - Order delivered
- `refund-confirmation-email.tsx` - Refund processed
- `back-in-stock-email.tsx` - Product available again

**Account**:
- `verification-email.tsx` - Email verification
- `password-reset-email.tsx` - Password reset link
- `password-changed-email.tsx` - Password change confirmation

**Admin**:
- `admin-new-order-email.tsx` - New order notification
- `admin-dispute-alert-email.tsx` - Payment dispute alert

### Sending Emails

```typescript
import { sendEmail } from "@/shared/lib/email"
import { OrderConfirmationEmail } from "@/emails/order-confirmation-email"

await sendEmail({
  to: user.email,
  subject: "Confirmation de commande",
  react: OrderConfirmationEmail({ order, user }),
})
```

## Constants

### Shared Constants (`shared/constants/`)

```typescript
// Brand identity
import { BRAND } from "@/shared/constants/brand"
// { name: "Synclune", tagline: "...", contact: {...}, social: {...} }

// Shipping countries (FR, DOM-TOM, EU)
import { SHIPPING_COUNTRIES } from "@/shared/constants/countries"

// Cross-module cache tags
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags"
// { ADMIN_BADGES, ADMIN_ORDERS_LIST, ADMIN_CUSTOMERS_LIST, ADMIN_INVENTORY_LIST }
```

### Module Constants

Each module exports constants in `constants/`:
- Cache tags and helpers
- UI text (French)
- Thresholds (e.g., `STOCK_THRESHOLDS.LOW_STOCK = 5`)
- Select options for forms

## Security

### Rate Limiting (Arcjet)

```typescript
import { enforceRateLimitForCurrentUser } from "@/shared/lib/actions"

export async function sensitiveAction(prevState, formData) {
  const rateLimitResult = await enforceRateLimitForCurrentUser({ max: 5, window: "1m" })
  if (rateLimitResult) return rateLimitResult // Returns ActionState with error

  // Continue with action...
}
```

### Input Validation

All inputs validated server-side with Zod:
- FormData extraction + validation in actions
- Schema defined in `modules/*/schemas/`
- French error messages for user feedback

### Webhook Security

- Stripe signature verification (`stripe.webhooks.constructEvent`)
- Idempotency with `WebhookEvent` model
- 5-minute replay window

### RGPD Compliance

- User consent tracking (`rgpdConsentAt`, `marketingConsentAt`)
- Soft deletes with 10-year retention
- Data export functionality (`modules/users/actions/export-user-data.ts`)
- Anonymization fields available

## Performance

### Image Optimization

- Formats: AVIF, WebP with fallback
- Sizes: Responsive `sizes` attribute on all images
- Blur placeholders: Generated and stored in `SkuMedia.blurDataUrl`
- Preload: Above-fold images use `priority` and `fetchPriority="high"`

### Streaming & Suspense

Every page uses Suspense boundaries:
```tsx
<Suspense fallback={<ProductListSkeleton />}>
  <ProductList />
</Suspense>
```

Skeletons match exact structure of content for **zero CLS**.

### Pagination

- Offset pagination for admin lists (with URL state)
- Cursor pagination for large datasets (better performance)
- Per-page options: 10, 25, 50, 100

## Conventions

### Language
- **UI text**: French (toutes les interfaces utilisateur)
- **Code**: English (variable names, function names)
- **Comments**: French for explanations, English for JSDoc

### Naming
- **Files**: `kebab-case.ts` (e.g., `order-confirmation.tsx`)
- **Components**: `PascalCase` (e.g., `OrderConfirmation`)
- **Functions/Variables**: `camelCase` (e.g., `calculateTotal`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `CACHE_TAGS`)
- **Types**: `PascalCase` (e.g., `OrderStatus`)

### Commits
Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### URL Structure (French)
- `/connexion`, `/inscription` (auth)
- `/panier`, `/paiement` (shopping)
- `/commandes`, `/favoris` (user area)
- `/produits`, `/collections`, `/creations` (catalog)

### Path Aliases
- `@/*` - Root directory (e.g., `@/modules/products/...`)
- `@/fonts` - `./styles/fonts`
