# CLAUDE.md

## Project Overview

Synclune - E-commerce bijoux artisanaux (Next.js 16, React 19, TypeScript, Prisma 7, Stripe).

- **Storefront** (`/boutique`) - Produits, panier, paiement
- **Admin** (`/admin`) - Catalogue, commandes, analytics
- **Stripe** - Paiements, webhooks, remboursements
- **Emails** - React Email + Resend

## Commands

```bash
pnpm dev                    # Dev server
pnpm build                  # Build (runs prisma generate)
pnpm test                   # Vitest
pnpm prisma migrate dev     # Migrations
pnpm prisma studio          # DB GUI
```

## Architecture

```
app/
├── (auth)/              # Connexion, inscription, mot-de-passe
├── (boutique)/          # Storefront client
├── admin/               # Dashboard admin
└── api/                 # Auth, webhooks, uploads

modules/                 # DDD - 23 modules
├── [module]/
│   ├── actions/         # Server Actions (mutations)
│   ├── data/            # Data fetching + cache
│   ├── services/        # Pure business logic
│   ├── components/      # React components
│   ├── schemas/         # Zod schemas
│   ├── constants/       # Cache tags, config
│   ├── utils/           # Helpers, query builders
│   └── types/           # TypeScript types

shared/                  # Cross-cutting
├── components/          # UI (shadcn/ui), forms
├── lib/                 # prisma, email, actions helpers
├── hooks/               # useFilter, usePagination...
└── stores/              # Zustand (dialogs, cookies)
```

## Key Technologies

- **Auth**: Better Auth (email, Google, GitHub)
- **Database**: PostgreSQL (Neon) + Prisma 7
- **Forms**: TanStack Form + `useAppForm` hook
- **State**: Zustand (dialogs, cookie consent)
- **UI**: shadcn/ui + Tailwind + Framer Motion

### React 19 - NO MEMOIZATION

Le compilateur React 19 optimise automatiquement. **NE PAS utiliser:**
- `useMemo()`, `useCallback()`, `React.memo()`

## Server Actions Pattern

```typescript
"use server"

import { requireAdmin, validateInput, success, handleActionError } from "@/shared/lib/actions"
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

**Helpers** (`shared/lib/actions/`):
- `requireAuth()`, `requireAdmin()` - Auth checks
- `success()`, `error()`, `notFound()` - Responses
- `validateInput()` - Zod validation
- `handleActionError()` - Error handling

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

**Profiles** (next.config.ts): `products`, `collections`, `reference`, `cart`, `session`, `dashboard`

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

TanStack Form avec `useAppForm`. Voir `shared/components/forms/README.md`.

```typescript
const form = useAppForm<MyInput>({
  defaultValues: { name: "" },
  validators: { onChange: schema },
  onSubmit: async ({ value }) => { /* ... */ }
})
```

## Security

- **Rate limiting**: Arcjet + in-memory per-action
- **Validation**: Zod server-side
- **RGPD**: Soft deletes, consent tracking, data export
- **Webhooks**: Signature verification + idempotency

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
