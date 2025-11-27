# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synclune is a French artisanal jewelry e-commerce platform built with Next.js 16 App Router, React 19, and TypeScript. It features a customer-facing storefront, an admin dashboard, and integrates with Stripe for payments.

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

## Architecture

### Directory Structure

- `app/` - Next.js App Router pages and API routes
  - `(auth)/` - Authentication pages (connexion, inscription, etc.)
  - `(boutique)/` - Customer-facing storefront
  - `admin/` - Admin dashboard
  - `api/` - API routes (auth, webhooks, uploadthing)
- `modules/` - Domain-driven business logic (DDD pattern)
- `shared/` - Cross-cutting concerns (components, lib, utils, hooks)
- `prisma/` - Database schema and migrations
- `emails/` - React Email templates

### Module Structure

Each module in `modules/` follows a consistent pattern:
- `actions/` - Server Actions ("use server")
- `data/` - Data fetching functions with caching
- `components/` - Module-specific React components
- `schemas/` - Zod validation schemas
- `types/` - TypeScript types
- `constants/` - Module constants
- `utils/` - Module utilities

Modules: auth, cart, collections, colors, customization, dashboard, discount, newsletter, orders, payments, product-types, products, refund, skus, users, wishlist

### Key Technologies

- **Auth**: Better Auth with email/password and Google OAuth
- **Database**: PostgreSQL via Prisma 7 ORM
- **Payments**: Stripe (checkout sessions, webhooks)
- **File uploads**: UploadThing
- **Forms**: TanStack Form with custom hooks (see `shared/components/forms/README.md`)
- **State**: Zustand for client state
- **Emails**: React Email + Resend

### Caching System (Next.js 16)

Cache directives:
- `"use cache"` - Public shared data (products, collections)
- `"use cache: private"` - Per-user data (cart, wishlist)

Cache configuration (decentralized by module):
- `modules/*/constants/cache.ts` - Tags, cache helpers, and invalidation helpers per module
- `next.config.ts` - Cache life profiles (products, collections, reference, productDetail, dashboard, changelog)

Pattern:
```typescript
// In modules/products/constants/cache.ts
export const PRODUCTS_CACHE_TAGS = { LIST: "products-list", DETAIL: (slug) => `product-${slug}` }
export function cacheProducts() { cacheLife("products"); cacheTag(PRODUCTS_CACHE_TAGS.LIST) }
export function getProductInvalidationTags(slug: string): string[] { ... }
```

Invalidate with `revalidateTag()` using tags from each module's constants.

### Server Actions Pattern

Actions use helpers from `shared/lib/actions/`:
```typescript
import { requireAuth, requireAdmin, validateInput, success, error } from "@/shared/lib/actions"
```

Standard response type: `ActionState` with `ActionStatus` enum (SUCCESS, ERROR, UNAUTHORIZED, etc.)

### Path Aliases

- `@/*` - Root directory (e.g., `@/modules/products/...`)
- `@/fonts` - `./styles/fonts`

## Conventions

- **Language**: UI and comments in French, code in English
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- **Forms**: Use `useAppForm` hook with `form.AppField` pattern
- **Data fetching**: Functions in `modules/*/data/` with cache tags
- **Mutations**: Server Actions in `modules/*/actions/` with "use server"
