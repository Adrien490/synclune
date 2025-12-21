# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synclune is a French handmade jewelry e-commerce platform built with Next.js 16 App Router, React 19, and TypeScript. The brand focuses on unique, handcrafted creations at accessible prices (not luxury/high-end). It features:
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

# Utility scripts
pnpm verify:stripe              # Verify Stripe configuration
pnpm validate:production-ready  # Pre-deployment validation
pnpm generate:video-thumbnails  # Generate video thumbnails (requires FFmpeg)
```

### Manual Scripts

```bash
# Generate blur placeholders for images
pnpm exec tsx scripts/generate-blur-placeholders.ts [--dry-run] [--parallel=N]

# Clean up expired guest carts
pnpm exec tsx scripts/cleanup-expired-carts.ts [--dry-run]

# Clean up expired guest wishlists
pnpm exec tsx scripts/cleanup-expired-wishlists.ts [--dry-run]
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
│   └── paiement/     # Checkout flow (panier géré via CartSheet client-side)
├── admin/            # Admin dashboard (protected, ADMIN role required)
│   ├── catalogue/    # Products, colors, materials, collections, types
│   ├── ventes/       # Orders, refunds
│   ├── marketing/    # Newsletter, stock notifications, promo codes
│   └── utilisateurs/ # User management
└── api/              # API routes
    ├── auth/[...all]/ # Better Auth handler
    ├── webhooks/stripe/ # Stripe webhooks (idempotent)
    └── uploadthing/  # File uploads

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

## Database Schema

### Overview

- **30 models** organized by domain
- **14 enums** for type safety
- **PostgreSQL** via Neon serverless adapter
- **Prisma 7** ORM with custom constraints

### Enums Reference

| Category | Enums |
|----------|-------|
| Auth | `Role` (USER, ADMIN), `AccountStatus` (ACTIVE, INACTIVE, PENDING_DELETION, ANONYMIZED) |
| Product | `ProductStatus`, `CollectionStatus`, `MediaType`, `CurrencyCode` |
| Shipping | `ShippingCarrier` (COLISSIMO, CHRONOPOST, MONDIAL_RELAY, DPD, OTHER), `ShippingMethod` |
| Orders | `OrderStatus`, `PaymentStatus`, `PaymentMethod`, `FulfillmentStatus`, `InvoiceStatus` |
| Refunds | `RefundReason`, `RefundStatus`, `RefundAction` |
| Audit | `OrderAction`, `OperationCategory` (GOODS, SERVICES, MIXED - French fiscal requirement) |
| Marketing | `NewsletterStatus` (PENDING, CONFIRMED, UNSUBSCRIBED), `StockNotificationStatus`, `DiscountType` |
| Webhooks | `WebhookEventStatus` |

### Models by Domain

#### Auth & Users (5 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | User accounts | role, email, stripeCustomerId, RGPD fields (termsAcceptedAt, marketingEmailConsentedAt, anonymizedAt) |
| `Session` | Auth sessions | token, expiresAt, ipAddress, userAgent |
| `Account` | OAuth providers | providerId, accountId, accessToken, refreshToken |
| `Verification` | Email verification | identifier, value, expiresAt |
| `Address` | Shipping/billing | firstName, lastName, address1, postalCode, city, country, isDefault |

#### Catalog (8 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `ProductType` | Product categories | slug, label, isSystem |
| `Color` | Color attributes | slug, name, hex |
| `Material` | Material attributes | slug, name, description |
| `Collection` | Product groupings | slug, name, status |
| `ProductCollection` | Many-to-many join | isFeatured, addedAt |
| `Product` | Main products | slug, title, status, typeId |
| `ProductSku` | Variants | sku, priceInclTax, compareAtPrice, inventory, colorId, materialId, size |
| `SkuMedia` | Images/videos | url, thumbnailUrl, blurDataUrl, mediaType, isPrimary |

#### Shopping (4 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Cart` | Shopping carts | userId OR sessionId, expiresAt |
| `CartItem` | Cart contents | skuId, quantity, priceAtAdd |
| `Wishlist` | Favorites | userId (unique) |
| `WishlistItem` | Wishlist contents | skuId, priceAtAdd |

#### Orders & Fulfillment (4 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Order` | Orders | orderNumber, stripe IDs, addresses snapshot, amounts, status, paymentStatus, fulfillmentStatus |
| `OrderItem` | Line items | productSnapshot, skuSnapshot, price, quantity |
| `OrderHistory` | Audit trail | action, previousStatus, newStatus, authorId, source |
| `OrderNote` | Internal notes | content, authorId, authorName |

#### Refunds (3 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Refund` | Refund requests | amount, reason, status, stripeRefundId, processedAt |
| `RefundItem` | Refunded items | orderItemId, quantity, amount, restock |
| `RefundHistory` | Refund audit | action, note, authorId |

#### Discounts (2 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Discount` | Promo codes | code, type (PERCENTAGE/FIXED_AMOUNT), value, startsAt, endsAt, usageCount |
| `DiscountUsage` | Usage tracking | discountId, orderId, userId, amountApplied |

#### Marketing (2 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `NewsletterSubscriber` | Newsletter (double opt-in) | email, status, confirmationToken, confirmedAt, unsubscribeToken |
| `StockNotificationRequest` | Back in stock alerts | skuId, email, status, notifiedAt |

#### Webhooks (1 model)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `WebhookEvent` | Idempotency | stripeEventId, eventType, status, attempts, payload |

### Database Patterns

#### Soft Deletes (10-year retention - Art. L123-22 Code de Commerce)

Models with `deletedAt`: User, Product, ProductSku, Order, Refund, OrderNote, DiscountUsage, NewsletterSubscriber, StockNotificationRequest

#### Data Snapshots

- `CartItem.priceAtAdd` / `WishlistItem.priceAtAdd` - Price at add time
- `OrderItem.productSnapshot` / `skuSnapshot` - Full product state at order
- `Order.shippingAddress` / `billingAddress` - Address at order time

#### Custom Constraints

- Partial unique index: `Address(userId)` WHERE `isDefault = true`
- Check constraint: `ProductSku.inventory >= 0`

#### Micro-Enterprise Tax Regime

Article 293 B CGI: TVA non applicable (CA < 91,900€/year). All prices are final prices without VAT. Tax fields reserved for future migration.

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

### React 19 Compiler Optimizations

React 19 includes an automatic compiler that handles memoization. **Do NOT use:**
- `useMemo()` - The compiler auto-memoizes computed values
- `useCallback()` - The compiler auto-memoizes functions
- `React.memo()` - The compiler optimizes re-renders automatically

These hooks are unnecessary and add code complexity without benefit. The React 19 compiler analyzes components and applies optimizations automatically.

## Environment Variables

### Validation (`shared/lib/env.ts`)

All environment variables are validated at startup with Zod. App exits with detailed error if validation fails.

### Required Variables

| Variable | Service | Format |
|----------|---------|--------|
| `DATABASE_URL` | Database | PostgreSQL connection string (Neon) |
| `BETTER_AUTH_SECRET` | Auth | Min 32 chars, cryptographically secure |
| `RESEND_API_KEY` | Email | Starts with `re_` |
| `STRIPE_SECRET_KEY` | Payments | Starts with `sk_` |
| `STRIPE_WEBHOOK_SECRET` | Webhooks | Starts with `whsec_` |
| `UPLOADTHING_TOKEN` | Upload | UploadThing API token |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments | Starts with `pk_` |

### Optional Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | Auth | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Auth | Google OAuth |
| `ARCJET_KEY` | Security | Rate limiting & bot protection |
| `CRON_SECRET` | Cron | Webhook validation for scheduled tasks |
| `STRIPE_SHIPPING_RATE_*` | Payments | Shipping rate IDs (FRANCE, DOM_TOM, EUROPE) |

### Helper Functions

```typescript
import { env, getEnvOrThrow, getEnvOrDefault } from "@/shared/lib/env"

const apiKey = env.STRIPE_SECRET_KEY        // Type-safe access
const optional = getEnvOrDefault("KEY", "") // With fallback
const required = getEnvOrThrow("KEY", ctx)  // Throws with context if missing
```

## Server Actions Pattern

All mutations use Server Actions with a standardized pattern:

```typescript
"use server"

import { updateTag } from "next/cache"
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

    // 4. Cache invalidation (updateTag pour read-your-own-writes dans Server Actions)
    const tags = getMyInvalidationTags(result.id)
    tags.forEach(tag => updateTag(tag))

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

| Directive | Usage | Example Modules |
|-----------|-------|-----------------|
| `"use cache"` | Public shared data | products, collections, colors, materials |
| `"use cache: private"` | Per-user data (isolated by userId/sessionId) | cart, wishlist, orders, addresses, users |
| `"use cache: remote"` | After `await connection()` for dashboard | dashboard (planned) |

### Cache Life Profiles (next.config.ts)

| Profile | Stale | Revalidate | Expire | Used For |
|---------|-------|-----------|--------|----------|
| `products` | 15m | 5m | 6h | Product lists, searches |
| `collections` | 1h | 15m | 1d | Collection pages |
| `reference` | 7d | 1d | 30d | Colors, materials, types, legal pages |
| `productDetail` | 15m | 5m | 6h | Single product pages |
| `dashboard` | 1m | 30s | 5m | Admin KPIs, charts |
| `cart` | 5m | 1m | 30m | Cart data |
| `session` | 1m | 30s | 5m | Current user data |
| `userOrders` | 2m | 1m | 10m | User order history |
| `relatedProducts` | 30m | 10m | 3h | Related products |
| `skuStock` | 30s | 15s | 1m | SKU inventory levels |

### Wrapper Pattern for User Data

**IMPORTANT:** Functions that access `cookies()` or `headers()` cannot use `"use cache"` directly. Use the wrapper pattern:

```typescript
// 1. Public function - accesses runtime APIs (cookies/headers)
export async function getCart(): Promise<GetCartReturn> {
  const session = await getSession();         // accesses headers()
  const userId = session?.user?.id;
  const sessionId = !userId ? await getCartSessionId() : null;  // accesses cookies()
  return fetchCart(userId, sessionId);        // passes serializable params to cached function
}

// 2. Private cached function - receives serializable parameters
async function fetchCart(userId?: string, sessionId?: string): Promise<GetCartReturn> {
  "use cache: private";                       // Per-user isolation
  cacheLife("cart");
  cacheTag(userId ? `cart-user-${userId}` : `cart-session-${sessionId}`);

  // Database query here
  return prisma.cart.findFirst({ where: userId ? { userId } : { sessionId } });
}
```

**Files using this pattern:**
- `modules/cart/data/get-cart.ts`
- `modules/wishlist/data/get-wishlist-sku-ids.ts`
- `modules/orders/utils/fetch-user-orders.ts`
- `modules/addresses/data/get-user-addresses.ts`
- `modules/users/data/get-current-user.ts`

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

### Data Function Pattern (Public Data)

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

## Form Components

### Architecture

Forms are built on **TanStack Form** with React 19 integration via custom `useAppForm` hook. Documentation: `shared/components/forms/README.md`

### Available Field Types

| Component | Purpose | Built-in Label |
|-----------|---------|----------------|
| `InputField` | Text, email, password, number | Yes |
| `InputGroupField` | Input with prefix/suffix addons | No |
| `SelectField` | Typed select with generics | Yes |
| `CheckboxField` | Single checkbox | Yes |
| `RadioGroupField` | Radio button group | Yes |
| `TextareaField` | Multi-line text | Yes |
| `TextareaGroupField` | Textarea with addons | No |

### Layout Components

| Component | Purpose |
|-----------|---------|
| `FormLayout` | Grid container (1-4 columns, responsive gap) |
| `FormSection` | Section with title and description |
| `FormFooter` | Sticky footer with actions, required field hint |
| `FieldLabel` | Label with optional/required indicators, tooltip support |

### Validation Pattern

```typescript
const form = useAppForm<MyInput>({
  defaultValues: { name: "", email: "" },
  validators: {
    onChange: mySchema,              // Inline Zod validation
    onChangeAsync: asyncValidator,   // Async validation
    onChangeListenTo: ["otherField"] // Cross-field validation
  },
})
```

### Field Usage

```typescript
<form.AppField
  name="price"
  children={(field) => (
    <InputGroupField
      field={field}
      type="number"
      addon={{ position: "end", content: "€" }}
    />
  )}
/>
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

## Utilities

### Date Formatting (`shared/utils/dates.ts`)

```typescript
formatDateShort(date)        // "1 déc 2024"
formatDateTime(date)         // "1 déc 2024 à 14:30"
formatRelativeTime(date)     // "il y a 2 jours"
isRecent(date, daysAgo)      // true if within N days
```

### URL Parameter Parsing (`shared/utils/parse-search-params.ts`)

```typescript
searchParamParsers.cursor(value)      // 25-char CUID validation
searchParamParsers.direction(value)   // "forward" | "backward"
searchParamParsers.perPage(value)     // Number with min/max bounds
searchParamParsers.search(value)      // String with max length
searchParamParsers.enum(value, opts)  // Type-safe enum parsing
searchParamParsers.boolean(value)     // Parses "true"/"false"
searchParamParsers.date(value)        // ISO datetime
searchParamParsers.stringArray(value) // Array with optional schema
```

### Callback Patterns (`shared/utils/with-callbacks.ts`)

```typescript
const [state, action] = useActionState(
  withCallbacks(myServerAction, {
    onStart: () => toast.loading("..."),
    onEnd: (ref) => toast.dismiss(ref),
    onSuccess: (result) => { /* custom logic */ },
    onError: (result) => { /* error handling */ }
  }),
  undefined
)
```

### Toast Callbacks (`shared/utils/create-toast-callbacks.ts`)

```typescript
createToastCallbacks({
  loadingMessage: "Opération en cours...",
  onSuccess: () => router.refresh(),
})
```

### Sanitization (`shared/lib/sanitize.ts`)

```typescript
sanitizeForEmail(str) // Removes control chars, escapes HTML, 10k limit
escapeHtml(str)       // Basic HTML entity escaping
newlinesToBr(str)     // Converts \n to <br> (call AFTER sanitize)
```

### Error Handling (`shared/lib/actions/errors.ts`)

```typescript
// In catch blocks - converts any error to ActionState
return handleActionError(e, "Erreur lors de la création")

// HOF wrapper for entire action
const safeAction = withErrorHandling(myAction, "Erreur par défaut")
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

**Cookie Consent Store** - RGPD cookie preferences (persisted in localStorage)

### Store Providers

Providers use singleton pattern with hydration handling:

```typescript
// In root layout
<CookieConsentStoreProvider>
  <DialogStoreProvider>
    <AlertDialogStoreProvider>
      {children}
    </AlertDialogStoreProvider>
  </DialogStoreProvider>
</CookieConsentStoreProvider>
```

**Hydration Fix**: Providers use `useEffect` fallback for `onRehydrateStorage` race condition with Zustand persist middleware.

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

### Device Detection Hooks (`shared/hooks/`)

Two distinct hooks for different detection needs:

| Hook | Detects | Use Case |
|------|---------|----------|
| `useIsMobile` | Screen width < 768px | Responsive layout, grid columns, font sizes |
| `useIsTouchDevice` | `(hover: none) and (pointer: coarse)` | Touch interactions, parallax, hover effects |

**Key difference:**
- iPad Pro landscape: `useIsMobile() = false` (1024px), `useIsTouchDevice() = true`
- Small laptop screen: `useIsMobile() = true`, `useIsTouchDevice() = false`

```typescript
import { useIsMobile, useIsTouchDevice } from "@/shared/hooks"

// Responsive layout (screen size)
const isMobile = useIsMobile()
// → Show 1 column on mobile, 3 on desktop

// Touch interactions (device capability)
const isTouch = useIsTouchDevice()
// → Disable parallax, hover effects, drag animations
```

Both hooks are:
- SSR-safe with `useSyncExternalStore`
- Reactive to changes (screen resize, device rotation, Bluetooth keyboard connect/disconnect)
- Default to `false` on server (desktop-first)

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
- `Toolbar` - Filters, search, column visibility
- `SelectionToolbar` - Bulk actions for selected items
- `TableScrollContainer` - Horizontal scrolling

**Filters**:
- `FilterSheet` - Mobile-friendly filter panel
- `FilterBadges` - Visual filter chips
- `DateRangeFilter`, `SelectFilter`, `SortSelect`

### Animations (`shared/components/animations/`)

Framer Motion components: Fade, Slide, Stagger, Reveal, Pulse, Hover, Tap, Presence

## Data Tables

### Toolbar Components

| Component | Purpose |
|-----------|---------|
| `Toolbar` | Container for search, filters, actions (responsive, collapsible on mobile) |
| `SelectionToolbar` | Bulk actions bar when items selected (animated counter) |
| `FilterSheetWrapper` | Mobile-friendly side panel for filters |
| `TableEmptyState` | Empty state with icon, title, description, optional action |

### Pagination

| Component | Pattern | Use Case |
|-----------|---------|----------|
| `Pagination` | Offset-based | Admin lists with page-size selector (20, 50, 100, 200) |
| `CursorPagination` | Cursor-based | Large datasets with "Load more" pattern |

### Table Hooks

```typescript
// URL-based filter state
const { setFilter, removeFilter, hasActiveFilters, clearAllFilters } = useFilter({
  filterPrefix: "filter_",
  preservePage: false,
})

// URL-based selection for bulk operations
const { selectedItems, handleSelectionChange, clearAll, getSelectedCount } = useSelection("selected")

// Cursor pagination for streaming data
const { cursor, hasMore, loadMore } = useCursorPagination()

// Sort dropdown state
const { value, setSort, clearSort, isPending } = useSortSelect()

// Toolbar collapse state (cookie-persisted)
const { isCollapsed, toggle, isPending } = useToolbarCollapsed()
```

### Row Actions Pattern

```typescript
// In table row component
const { openDialog } = useDialogStore()
const { openDialog: openAlertDialog } = useAlertDialogStore()

// Non-destructive action
openDialog("edit-product", { productId: "123" })

// Destructive action (delete confirmation)
openAlertDialog("delete-confirm", {
  title: "Supprimer ?",
  onConfirm: () => handleDelete()
})
```

## Prisma Patterns

### Client Configuration (`shared/lib/prisma.ts`)

```typescript
import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

// Neon serverless adapter for edge compatibility (Prisma 7)
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })

// Soft delete helpers
export const notDeleted = { deletedAt: null } as const

export const softDelete = {
  order: (id: string) => prisma.order.update({
    where: { id },
    data: { deletedAt: new Date() }
  }),
  user: (id: string) => prisma.user.update({ ... }),
  refund: (id: string) => prisma.refund.update({ ... }),
  // ... other models
}
```

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

> **Note:** Les invoices Stripe sont téléchargées directement via l'URL Stripe (`invoice.invoice_pdf`).

### Stripe Webhook Idempotency

Webhooks use `WebhookEvent` model to prevent duplicate processing:
- 5-minute replay window
- `stripeEventId` as idempotency key
- Signature verification before processing

### Cron Jobs (`vercel.json`)

Les tâches planifiées sont configurées dans `vercel.json` et exécutent des scripts manuels:

| Schedule | Script | Purpose |
|----------|--------|---------|
| Daily | `scripts/cleanup-expired-carts.ts` | Remove expired guest carts (>30 days) |
| Daily | `scripts/cleanup-expired-wishlists.ts` | Remove expired guest wishlists (>30 days) |

```bash
# Exécution manuelle
pnpm exec tsx scripts/cleanup-expired-carts.ts [--dry-run]
pnpm exec tsx scripts/cleanup-expired-wishlists.ts [--dry-run]
```

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

### Rate Limiting Strategy

**Dual-layer protection:**
1. **Arcjet** - DDoS protection, bot detection, global rate limits
2. **In-memory** - Per-action fine-grained limits

#### Arcjet Instances (`shared/lib/arcjet.ts`)

| Instance | Purpose | Config |
|----------|---------|--------|
| `aj` | General API | Shield + Bot Detection + Rate Limiting |
| `ajNewsletter` | Newsletter subs | Strict, no bots allowed |
| `ajAuth` | Authentication | 5 attempts / 15 minutes |
| `ajEmailValidation` | Email checks | Built-in Arcjet validation |
| `ajNewsletterConfirm` | Token validation | 10 / hour |
| `ajNewsletterUnsubscribe` | Unsubscribe | 10 / hour |

#### Per-Action Limits (`shared/lib/rate-limit-config.ts`)

| Action | Limit | Window |
|--------|-------|--------|
| Cart operations | 15 | 1 minute |
| Login attempts | 5 | 15 minutes |
| Signups | 3 | 1 hour |
| Newsletter | 5 | 1 hour |
| Password reset | 3 | 15 minutes |

*Dev mode multiplies all limits by 10.*

#### Usage Pattern

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

### Error Handling

#### Error Boundaries

```typescript
// Custom error boundary pattern (e.g., GalleryErrorBoundary)
export class GalleryErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[GalleryErrorBoundary] Erreur capturée:", error)
    // TODO: Sentry integration for production monitoring
  }
}
```

#### Error Pages

| File | Purpose | Accessibility |
|------|---------|---------------|
| `error.tsx` | Runtime errors | `role="alert"`, `aria-live="assertive"` |
| `not-found.tsx` | 404 pages | Custom design with `aria-hidden` decorative elements |

Both pages include retry functionality and proper error digest display.

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

## SEO & Metadata

### Configuration (`shared/constants/seo-config.ts`)

```typescript
import { SITE_URL, BUSINESS_INFO, SEO_DEFAULTS } from "@/shared/constants/seo-config"
import { getLocalBusinessSchema, getWebSiteSchema } from "@/shared/constants/seo-config"
```

### Page Metadata Pattern

```typescript
// Static metadata in page.tsx
export const metadata: Metadata = {
  title: "Page Title",
  description: "...",
  openGraph: { type: "website", locale: "fr_FR", ... },
}

// Dynamic metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.slug)
  return generateProductMetadata(product)
}
```

### Structured Data (JSON-LD)

```typescript
import { generateStructuredData } from "@/modules/products/utils/seo"

// In page component
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(generateStructuredData(product)) }}
/>
```

### Local Business Schema

Includes SIREN/SIRET, GPS coordinates (Nantes), VAT info for local SEO.

## Analytics

### Vercel Analytics (RGPD-compliant)

Analytics only loads if user accepted cookies:

```typescript
// shared/components/conditional-analytics.tsx
export function ConditionalAnalytics() {
  const { accepted } = useCookieConsentStore()
  if (!accepted) return null
  return <Analytics />
}
```

Used in root layout alongside `<CookieBanner />` for RGPD compliance.

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
