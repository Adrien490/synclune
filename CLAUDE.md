# CLAUDE.md

## Project Overview

Synclune - E-commerce bijoux artisanaux (Next.js 16, React 19, TypeScript, Prisma 7, Stripe).

- **Storefront** (`/boutique`) - Produits, panier, paiement
- **Admin** (`/admin`) - Catalogue, commandes, analytics
- **Stripe** - Paiements, webhooks, remboursements
- **Emails** - React Email + Resend (24 templates)
- **PWA** - Serwist (service worker, offline page)

## Commands

```bash
pnpm dev                    # Dev server
pnpm build                  # Build (prisma generate + next build --turbopack)
pnpm start                  # Production server
pnpm test                   # Vitest
pnpm lint                   # ESLint
pnpm seed                   # Seed database
pnpm db:studio              # Prisma Studio GUI
pnpm email:dev              # Preview emails (port 3001)
pnpm analyse                # Bundle analysis
pnpm e2e                    # Playwright E2E tests
pnpm e2e:ui                 # Playwright UI mode
pnpm prisma migrate dev     # Create/apply migrations
```

## Architecture

```
app/
├── (auth)/                  # Connexion, inscription, mot-de-passe, verification email
├── (boutique)/              # Storefront (accueil, produits, collections, personnalisation, compte, legal, newsletter)
├── admin/                   # Dashboard admin (catalogue, commandes, marketing, contenu)
├── api/                     # Routes API (auth, cron, webhooks, search, uploadthing)
├── paiement/                # Pages paiement (confirmation, annulation, retour)
├── serwist/                 # Service Worker PWA
├── ~offline/                # Page offline PWA
└── sitemap-images.xml/      # Generation sitemap images

modules/                     # DDD - 23 modules
├── [module]/
│   ├── actions/             # Server Actions (mutations)
│   ├── data/                # Data fetching + cache ("use cache")
│   ├── services/            # Pure business logic (no side effects)
│   ├── components/          # React components
│   ├── schemas/             # Zod schemas
│   ├── constants/           # Cache tags, config
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript types
│   ├── utils/               # Helpers, query builders
│   └── lib/                 # Module-specific config (auth, cart, media, refunds, wishlist)
│
│   Specialized modules:
│   ├── cron/                # constants, lib, services (+ __tests__)
│   ├── emails/              # constants, services, types
│   └── webhooks/            # constants, handlers, services, types, utils

shared/                      # Cross-cutting concerns
├── actions/                 # Client-side state actions (FAB visibility)
├── components/              # UI (shadcn/ui), animations, forms, icons, loaders, navigation
├── constants/               # Cache tags, countries, currency, brand, SEO, navigation, limits
├── contexts/                # React Context definitions
├── data/                    # Shared data fetching with cache
├── hooks/                   # ~20 hooks (pagination, scroll, filter, media queries, touch)
├── lib/                     # Core: prisma, stripe, email-config, cache, rate-limit, actions/
├── providers/               # Root providers, dialog/sheet/store providers
├── schemas/                 # Shared Zod schemas (address, email, pagination, media, phone)
├── services/                # Shared business logic (unique name generator)
├── stores/                  # Zustand stores (5 stores)
├── styles/                  # Global styles, fonts
├── types/                   # Shared types (server actions, sessions, pagination, errors)
└── utils/                   # Formatting, slug, date, currency, password strength, seeded random
```

## Key Technologies

- **Auth**: Better Auth (email, Google, GitHub)
- **Database**: PostgreSQL (Neon) + Prisma 7
- **Forms**: TanStack Form + `useAppForm` hook
- **State**: Zustand (5 stores: dialogs, alert dialogs, sheets, cookie consent, badge counts)
- **UI**: shadcn/ui + Tailwind + Motion (v12, `motion/react`)
- **Uploads**: UploadThing
- **Analytics**: Vercel Analytics + Speed Insights

### React 19 - NO MEMOIZATION

Le compilateur React 19 optimise automatiquement. **NE PAS utiliser:**
- `useMemo()`, `useCallback()`, `React.memo()`

## Server Actions Pattern

```typescript
"use server"

import { requireAdmin } from "@/modules/auth/lib/require-auth"
import { validateInput, success, handleActionError } from "@/shared/lib/actions"
import { prisma } from "@/shared/lib/prisma"

export async function createSomething(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  if ("error" in admin) return admin.error

  const validation = validateInput(schema, { name: formData.get("name") })
  if (!validation.success) return error(validation.error.errors[0]?.message)

  try {
    await prisma.model.create({ data: validation.data })
    updateTag("cache-tag")
    return success("Cree avec succes")
  } catch (e) {
    return handleActionError(e, "Erreur creation")
  }
}
```

**Auth helpers** (`modules/auth/lib/require-auth`):
- `requireAuth()` - Verifies user authenticated + exists in DB
- `requireAdmin()` - Verifies ADMIN role (session only)
- `requireAdminWithUser()` - Verifies admin + returns user object

**Action helpers** (`shared/lib/actions/`):
- `success()`, `error()`, `notFound()`, `unauthorized()`, `forbidden()`, `validationError()` - Responses
- `validateInput()`, `validateFormData()` - Zod validation
- `handleActionError()`, `BusinessError` - Error handling
- `enforceRateLimit()` - Rate limiting

**Note**: Some actions use `.safeParse()` directly instead of `validateInput()`. Both patterns are valid.

## Caching

```typescript
// Public data
export async function getProducts() {
  "use cache"
  cacheLife("products")
  cacheTag("products-list")
  return prisma.product.findMany()
}

// User data - wrapper pattern (cookies/headers incompatibles avec "use cache")
export async function getCart() {
  const userId = (await getSession())?.user?.id
  return fetchCart(userId)
}

async function fetchCart(userId?: string) {
  "use cache: private"
  cacheLife("cart")
  cacheTag(`cart-${userId}`)
  return prisma.cart.findFirst({ where: { userId } })
}
```

**10 cache profiles** (next.config.ts):

| Profile | Stale | Revalidate | Usage |
|---------|-------|------------|-------|
| `skuStock` | 30s | 15s | Real-time stock levels |
| `dashboard` | 1m | 30s | Admin data |
| `session` | 1m | 30s | User session |
| `userOrders` | 2m | 1m | Order history |
| `cart` | 5m | 1m | Cart, wishlist, newsletter status |
| `products` | 15m | 5m | Product listings, search |
| `productDetail` | 15m | 5m | Single product, media, SKUs |
| `relatedProducts` | 30m | 10m | Related/suggested products |
| `collections` | 1h | 15m | Collections |
| `reference` | 7d | 24h | Legal pages, materials, colors, FAQs |

## Module Layers Pattern

Chaque module suit une architecture en couches pour la separation des responsabilites:

### data/ - Requetes DB cachees

Fonctions de lecture avec `"use cache"`. Jamais de mutations.

```typescript
export async function getOrders(params: GetOrdersParams) {
  const session = await getSession()
  return fetchOrders(params, session?.user?.id)
}

async function fetchOrders(params: GetOrdersParams, userId?: string) {
  "use cache"
  cacheLife("dashboard")
  cacheTag("orders-list")

  const where = buildOrderWhereClause(params) // Appel service
  return prisma.order.findMany({ where })
}
```

### services/ - Logique metier pure

Fonctions pures sans effets de bord. Pas de `"use server"`, pas de mutations DB.

```typescript
// modules/orders/services/order-query-builder.ts
export function buildOrderWhereClause(params: GetOrdersParams): Prisma.OrderWhereInput {
  const conditions: Prisma.OrderWhereInput[] = []

  if (params.search) {
    conditions.push(buildOrderSearchConditions(params.search))
  }
  if (params.filters) {
    conditions.push(buildOrderFilterConditions(params.filters))
  }

  return { AND: conditions, deletedAt: null }
}
```

### actions/ - Server Actions (mutations)

Mutations avec auth, validation, DB write, cache invalidation.

```typescript
"use server"

export async function cancelOrder(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  if ("error" in admin) return admin.error

  const validation = validateInput(schema, { id: formData.get("id") })
  if (!validation.success) return error(validation.error.errors[0]?.message)

  await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } })
  updateTag("orders-list")
  return success("Commande annulee")
}
```

### Matrice de decision

| Besoin | Layer |
|--------|-------|
| Lire des donnees avec cache | `data/` |
| Transformer/calculer (sans DB) | `services/` |
| Muter la base de donnees | `actions/` |
| Construire des WHERE clauses | `services/` |
| Helpers simples, type guards | `utils/` |

### Exception: Module webhooks

Le module `webhooks/` suit un pattern different car les webhooks Stripe sont des handlers internes (pas des Server Actions). Les fichiers dans `webhooks/services/` contiennent de la logique transactionnelle complete (lecture + mutation) pour garantir l'atomicite des operations critiques.

### Exception: Reads de validation dans actions/

Les requetes de lecture dans `actions/` sont acceptees pour:
- Verifications d'existence avant mutation (`findUnique` pour valider qu'un record existe)
- Verifications d'unicite (`findFirst` pour eviter les doublons de nom/code)
- Recuperation de donnees pour operations bulk (`findMany` avant update/delete groupe)

Ces reads sont atomiques avec la mutation et ne beneficieraient pas du cache (donnees potentiellement stales entre lecture et ecriture).

## API Routes

### Webhooks (`api/webhooks/`)
Stripe webhook handlers with signature verification + idempotency. Logic in `modules/webhooks/`.

### Cron Jobs (`api/cron/`)
14 Vercel cron jobs defined in `vercel.json`. Logic in `modules/cron/services/`.

| Job | Schedule |
|-----|----------|
| `cleanup-carts` | Daily 2:00 |
| `cleanup-wishlists` | Daily 2:30 |
| `cleanup-sessions` | Daily 3:00 |
| `process-account-deletions` | Daily 5:00 |
| `cleanup-newsletter` | Weekly Sunday 6:00 |
| `review-request-emails` | Daily 10:00 |
| `sync-async-payments` | Every 4h |
| `reconcile-refunds` | Every 6h |
| `process-scheduled-discounts` | Every 4h |
| `retry-webhooks` | Every 30min |
| `retry-failed-emails` | Every 15min |
| `cleanup-webhook-events` | Monthly 1st 7:00 |
| `hard-delete-retention` | Monthly 1st 8:00 |
| `cleanup-orphan-media` | Monthly 1st 9:00 |

### Other API Routes
- `api/auth/` - Better Auth handler
- `api/search/` - Search endpoint
- `api/uploadthing/` - UploadThing file upload handler

## Emails

24 transactional email templates in `emails/` using React Email + Resend.

Templates: order confirmation, shipping, delivery, cancellation, return, payment failed, refund (approved/confirmed), review request/response, newsletter (confirmation/welcome), password (reset/changed), verification, customization (request/confirmation), tracking update, admin notifications (new order, invoice failed, refund failed, webhook failed).

Config: `shared/lib/email-config.ts`. Preview: `pnpm email:dev`.

## Prisma Patterns

```typescript
import { notDeleted, softDelete } from "@/shared/lib/prisma"

// Exclude soft-deleted
await prisma.order.findMany({ where: { ...notDeleted } })

// Soft delete (10 ans retention legale)
await softDelete.order(orderId)
```

**Key enums**: `ProductStatus`, `OrderStatus`, `PaymentStatus`, `RefundStatus`, `FulfillmentStatus`

## Forms

TanStack Form avec `useAppForm`. Voir `shared/components/forms/` pour les composants de formulaire.

```typescript
const form = useAppForm<MyInput>({
  defaultValues: { name: "" },
  validators: { onChange: schema },
  onSubmit: async ({ value }) => { /* ... */ }
})
```

## Security

- **Rate limiting**: Arcjet + Upstash Redis per-action
- **Validation**: Zod server-side
- **RGPD**: Soft deletes, consent tracking, data export
- **Webhooks**: Stripe signature verification + idempotency + 5-minute anti-replay window
- **Security headers** (next.config.ts): CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Uploads**: UploadThing (server-validated)

## Conventions

| Type | Convention |
|------|------------|
| Files | `kebab-case.ts` |
| Components | `PascalCase` |
| Functions | `camelCase` |
| Constants | `UPPER_SNAKE_CASE` |
| UI text | French |
| Code | English |
| Commits | `feat:`, `fix:`, `docs:`, `refactor:` |
| Indentation | Tabs |
