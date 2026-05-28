# CLAUDE.md

## Project Overview

Synclune - E-commerce bijoux artisanaux (Next.js 16, React 19, TypeScript, Prisma 7, Stripe).

- **Storefront** (`/boutique`) - Produits, panier, paiement
- **Admin** (`/admin`) - Catalogue, commandes, analytics
- **Stripe** - Paiements, webhooks, remboursements
- **Emails** - React Email + Resend (16 templates)
- **PWA** - Serwist (service worker, offline page)

## Commands

```bash
pnpm dev                    # Dev server
pnpm build                  # Build (prisma generate + next build --turbopack)
pnpm start                  # Production server
pnpm test                   # Vitest
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript type checking (tsc --noEmit)
pnpm format                 # Prettier (format)
pnpm format:check           # Prettier (check only)
pnpm size                   # Bundle size check (size-limit)
pnpm size:check             # Bundle size check (JSON output)
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
├── (boutique)/              # Storefront (accueil, produits, collections, personnalisation, compte, legal)
├── admin/                   # Dashboard admin (catalogue, commandes, marketing, contenu)
├── api/                     # Routes API (auth, cron, webhooks, search, uploadthing)
├── paiement/                # Pages paiement (confirmation, annulation, retour)
├── serwist/                 # Service Worker PWA
├── ~offline/                # Page offline PWA
└── sitemap-images.xml/      # Generation sitemap images

modules/                     # DDD - 24 modules
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
├── hooks/                   # ~20 hooks (pagination, , filter, media queries, touch)
├── lib/                     # Core: prisma, stripe, email-config, cache, rate-limit, actions/
├── providers/               # Root providers, dialog/sheet/store providers
├── schemas/                 # Shared Zod schemas (address, email, pagination, media, phone)
├── services/                # Shared business logic (unique name generator)
├── stores/                  # Zustand stores (9 stores)
├── styles/                  # Global styles, fonts
├── types/                   # Shared types (server actions, sessions, pagination, errors)
└── utils/                   # Formatting, slug, date, currency, password strength, seeded random
```

## Key Technologies

- **Auth**: Better Auth (email, Google, GitHub)
- **Database**: PostgreSQL (Neon) + Prisma 7
- **Forms**: TanStack Form + `useAppForm` hook
- **State**: Zustand (9 stores: dialog, alert-dialog, sheet, cookie-consent, badge-counts, micro-toast, overlay-stack, admin-list-selection, admin-list-bulk-pending)
- **UI**: shadcn/ui + Tailwind + Motion (v12, `motion/react`)
- **Uploads**: UploadThing
- **Monitoring**: Sentry (error tracking, tunnel via `/monitoring`)
- **Analytics**: Vercel Analytics + Speed Insights

### React 19 - NO MEMOIZATION

Le compilateur React 19 optimise automatiquement. **NE PAS utiliser:**

- `useMemo()`, `useCallback()`, `React.memo()`

## Server Actions Pattern

```typescript
"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, success, handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";

export async function createSomething(
	prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(schema, { name: formData.get("name") });
	if (!validation.success) return error(validation.error.errors[0]?.message);

	try {
		await prisma.model.create({ data: validation.data });
		updateTag("cache-tag");
		return success("Cree avec succes");
	} catch (e) {
		return handleActionError(e, "Erreur creation");
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

**Validation patterns** — deux patterns coexistent légitimement :

- **`validateInput(schema, data)`** : pattern par défaut pour les Server Actions qui retournent `ActionState` avec un message d'erreur simple. Le wrapper retourne `{ data } | { error: ActionState }` — usage en `if ("error" in validation) return validation.error`.
- **`schema.safeParse(data)` direct** : à conserver uniquement quand l'action :
  1. Retourne un type custom (pas `ActionState`) — ex: `quick-search.ts` retourne `QuickSearchResult`, `validate-discount-code.ts` retourne `ValidateDiscountCodeReturn`.
  2. A besoin du `path` Zod pour enrichir le message d'erreur — ex: `reviews/*` et `skus/{create,update}` retournent `validationError("${path}: ${message}")` pour cibler le champ fautif côté UI.
  3. Branche sur le `path` pour appliquer une logique custom (retry, fallback) — ex: `validate-discount-code.ts` retry sans `userId` si seul ce champ est invalide.

Toute nouvelle action `ActionState` simple doit utiliser `validateInput()`. Ajouter un cas safeParse direct requiert une raison documentée (path-aware ou retour custom).

## Caching

```typescript
// Public data
export async function getProducts() {
	"use cache";
	cacheLife("catalog");
	cacheTag("products-list");
	return prisma.product.findMany();
}

// User data - wrapper pattern (cookies/headers incompatibles avec "use cache")
export async function getCart() {
	const userId = (await getSession())?.user?.id;
	return fetchCart(userId);
}

async function fetchCart(userId?: string) {
	"use cache: private";
	cacheLife("checkout");
	cacheTag(`cart-${userId}`);
	return prisma.cart.findFirst({ where: { userId } });
}
```

**4 cache profiles** (next.config.ts):

| Profile     | Stale | Revalidate | Usage                                                       |
| ----------- | ----- | ---------- | ----------------------------------------------------------- |
| `checkout`  | 1m    | 30s        | Cart, session, stock validation, order confirmation         |
| `user`      | 2m    | 1m         | Admin dashboard, user orders, user-scoped data              |
| `catalog`   | 15m   | 5m         | Products, SKUs, related products                            |
| `reference` | 7d    | 24h        | Legal, collections, materials, colors, FAQs, store settings |

**Invalidation des statuts commande (CACHE-AUDIT-010)** : toute mutation de `Order.status`/`paymentStatus` (Server Action, webhook handler, cron) DOIT invalider via `getOrderInvalidationTags(userId, orderId)` (`modules/orders/constants/cache.ts`) — jamais une liste de tags écrite à la main. Le helper couvre les tags user-scopés (`USER_ORDERS`, `LAST_ORDER`, `ACCOUNT_STATS`) et par-commande (`DETAIL`, `CONFIRMATION`, `HISTORY`) ; une liste partielle (`[LIST, ADMIN_ORDERS_LIST, ADMIN_BADGES]`) laisse l'espace client + le détail commande stale jusqu'à l'expiration du profil `user` (~10 min). Résoudre `userId` (ajouter `userId: true` au `select`) quand absent. Tags de cache toujours via une constante SSOT du module, jamais en littéral template.

## Module Layers Pattern

Chaque module suit une architecture en couches pour la separation des responsabilites:

### data/ - Requetes DB cachees

Fonctions de lecture avec `"use cache"`. Jamais de mutations.

```typescript
export async function getOrders(params: GetOrdersParams) {
	const session = await getSession();
	return fetchOrders(params, session?.user?.id);
}

async function fetchOrders(params: GetOrdersParams, userId?: string) {
	"use cache";
	cacheLife("user");
	cacheTag("orders-list");

	const where = buildOrderWhereClause(params); // Appel service
	return prisma.order.findMany({ where });
}
```

### services/ - Logique metier pure

Fonctions pures sans effets de bord. Pas de `"use server"`, pas de mutations DB.

```typescript
// modules/orders/services/order-query-builder.ts
export function buildOrderWhereClause(params: GetOrdersParams): Prisma.OrderWhereInput {
	const conditions: Prisma.OrderWhereInput[] = [];

	if (params.search) {
		conditions.push(buildOrderSearchConditions(params.search));
	}
	if (params.filters) {
		conditions.push(buildOrderFilterConditions(params.filters));
	}

	return { AND: conditions, deletedAt: null };
}
```

### actions/ - Server Actions (mutations)

Mutations avec auth, validation, DB write, cache invalidation.

```typescript
"use server";

export async function cancelOrder(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(schema, { id: formData.get("id") });
	if (!validation.success) return error(validation.error.errors[0]?.message);

	await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
	updateTag("orders-list");
	return success("Commande annulee");
}
```

### Matrice de decision

| Besoin                         | Layer       |
| ------------------------------ | ----------- |
| Lire des donnees avec cache    | `data/`     |
| Transformer/calculer (sans DB) | `services/` |
| Muter la base de donnees       | `actions/`  |
| Construire des WHERE clauses   | `services/` |
| Helpers simples, type guards   | `utils/`    |

### Exception: Module webhooks

Le module `webhooks/` suit un pattern different car les webhooks Stripe sont des handlers internes (pas des Server Actions). Les fichiers dans `webhooks/services/` contiennent de la logique transactionnelle complete (lecture + mutation) pour garantir l'atomicite des operations critiques.

### Exception: Reads de validation dans actions/

Les requetes de lecture dans `actions/` sont acceptees pour:

- Verifications d'existence avant mutation (`findUnique` pour valider qu'un record existe)
- Verifications d'unicite (`findFirst` pour eviter les doublons de nom/code)
- Recuperation de donnees pour operations bulk (`findMany` avant update/delete groupe)

Ces reads sont atomiques avec la mutation et ne beneficieraient pas du cache (donnees potentiellement stales entre lecture et ecriture).

### Exception: Services transactionnels partages

Certains fichiers `services/` contiennent des mutations DB ou I/O (email). Ce sont des services transactionnels appeles depuis plusieurs contextes (cron, webhooks, server components) ou la logique doit rester atomique:

| Fichier                                                | Raison                                                                                                                                                                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments/services/stripe-customer.service.ts`         | Paire atomique Stripe + DB pour checkout                                                                                                                                                                          |
| `payments/services/order-creation.service.ts`          | Transaction atomique stock lock + order + discount usage                                                                                                                                                          |
| `wishlist/services/notify-back-in-stock.ts`            | Notification atomique apres restock                                                                                                                                                                               |
| `cart/services/sku-validation.service.ts`              | Validation DB reads partagees entre actions + SKU selector                                                                                                                                                        |
| `reviews/services/send-review-requests.service.ts`     | Cron job — `order.update` pour flag `reviewRequest{Sent,Skipped}At` apres envoi email                                                                                                                             |
| `refunds/services/send-refund-confirmation.service.ts` | Émetteur unique email remboursement — `refund.updateMany` claim atomique (`confirmationEmailSentAt`) partagé entre cron `reconcile-refunds` + webhook `charge.refunded` + action `processRefund` (ORD-STRIPE-005) |
| `users/services/refresh-customer-routing.service.ts`   | Cron job — `user.update` pour rafraichir `customerRoutingKey` apres expiration TTL                                                                                                                                |
| `store-settings/services/auto-reopen.service.ts`       | Cron job — `storeSettings.updateMany` pour clear `closedUntil` aux dates échues                                                                                                                                   |
| `orders/services/persist-pdp-transmission.service.ts`  | E-invoicing — `OrderHistory` create + flags transmission PDP (immuable, Art. L123-22)                                                                                                                             |
| `orders/services/archive-credit-note-pdf.service.ts`   | E-invoicing — upload UploadThing + `Order.creditNotePdfHash` SHA-256 (avoir immuable)                                                                                                                             |

## API Routes

### Webhooks (`api/webhooks/`)

Stripe webhook handlers with signature verification + idempotency. Logic in `modules/webhooks/`.

### Cron Jobs (`api/cron/`)

23 Vercel cron jobs defined in `vercel.json` (SSOT). Logic in `modules/cron/services/` (or domain modules for transactional services). Détails complets : [`docs/CRONS.md`](docs/CRONS.md). Les crons e-invoicing sont détaillés dans [`docs/INVOICING.md § Crons`](docs/INVOICING.md).

| Job                               | Schedule           | Catégorie   |
| --------------------------------- | ------------------ | ----------- |
| `retry-post-webhook-tasks`        | Every 5 min        | revenue     |
| `reopen-store`                    | Every 15 min       | ops         |
| `retry-invoice-transmissions`     | Every 15 min       | e-invoicing |
| `retry-webhooks`                  | Every 30 min       | revenue     |
| `transmit-invoices`               | Every 30 min       | e-invoicing |
| `transmit-ereporting-batch`       | Every 30 min       | e-invoicing |
| `sync-async-payments`             | Every 4h           | revenue     |
| `reconcile-invoice-statuses`      | Every 4h           | e-invoicing |
| `reconcile-refunds`               | Every 6h, H+30     | revenue     |
| `build-ereporting-batch`          | Daily 1:00         | e-invoicing |
| `reconcile-invoices`              | Daily 2:00         | e-invoicing |
| `cleanup-wishlists`               | Daily 2:30         | retention   |
| `cleanup-sessions`                | Daily 3:00         | retention   |
| `cleanup-carts`                   | Daily 3:30         | retention   |
| `cleanup-pending-orders`          | Daily 4:30         | revenue     |
| `process-account-deletions`       | Daily 5:00         | RGPD        |
| `reconcile-voided-invoices`       | Daily 7:00         | e-invoicing |
| `send-review-requests`            | Daily 10:00        | engagement  |
| `alert-stuck-orders`              | Weekly Monday 9:00 | monitoring  |
| `refresh-stale-directory-entries` | Monthly 1st 6:00   | e-invoicing |
| `cleanup-webhook-events`          | Monthly 1st 7:00   | retention   |
| `hard-delete-retention`           | Monthly 1st 8:00   | RGPD        |
| `cleanup-orphan-media`            | Monthly 1st 9:00   | retention   |

### Other API Routes

- `api/auth/` - Better Auth handler
- `api/search/` - Search endpoint
- `api/uploadthing/` - UploadThing file upload handler

## Emails

16 templates React Email + Resend (dont 1 polyvalent `AdminAlertEmail` couvrant 8+ sous-types).

**Clients (14)** : order-confirmation, shipping-confirmation, tracking-update, delivery-confirmation, cancel-order-confirmation, refund-confirmed, payment-failed, back-in-stock, review-request (9 transactionnels/marketing) + welcome, account-deletion, verification, password-reset, oauth-account-linked (5 auth/compte).

**Admin (2 templates polyvalents)** : `admin-new-order-email` (toujours seul) + `admin-alert-email` paramétré par `type` (refund-failed, webhook-failed, order-processing, dispute, invoice, pdf-archive-failed, credit-note-failed, sequence-overflow, ereporting-stuck, stuck-orders, cron, checkout).

**Anti-doublon** : `idempotencyKey` Resend (24h cross-instance, ex: `admin-new-order:${orderId}`, `order-cancel:${orderId}`) + cache LRU in-process 10 min via `send-email.ts`. Pas de flag DB côté Order (KISS).

**Délivrabilité** : marketing emails (back-in-stock, review-request) ont `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` (RFC 8058) + `Precedence: bulk` + `Auto-Submitted: auto-generated` (RFC 3834).

**Endpoint désinscription** : `/notifications/desinscription` (token HMAC stateless) — alerte admin par email, **pas de persistance DB** ⇒ l'admin propage manuellement le retrait (limitation MVP, à itérer si volume).

Config: `shared/lib/email-config.ts`. Preview: `pnpm email:dev`.

## Prisma Patterns

```typescript
import { notDeleted, softDelete } from "@/shared/lib/prisma";

// Exclude soft-deleted
await prisma.order.findMany({ where: { ...notDeleted } });

// Soft delete (10 ans retention legale)
await softDelete.order(orderId);
```

**Key enums**: `ProductStatus`, `OrderStatus`, `PaymentStatus`, `RefundStatus`, `FulfillmentStatus`

### Migrations & rollback

Chaque nouvelle migration **doit** ajouter un `down.sql` paire dans le même dossier (`prisma/migrations/<timestamp>_<name>/down.sql`) pour permettre un rollback rapide en cas d'incident production. Exemple : `prisma/migrations/20251124_add_inventory_non_negative_constraint/down.sql`.

Pas de rétroactif sur les migrations existantes (risque trop élevé). En cas de besoin de rollback historique : restore Neon PITR.

### Transactions longues — timeouts explicites

Les defaults Prisma `$transaction` sont 5s timeout + 2s maxWait. Pour les transactions bulk (delete/update N records), tx avec `FOR UPDATE` lock, ou opérations dépendant d'I/O externes (Stripe, etc.), utiliser les constantes :

```typescript
import { prisma, TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma";

await prisma.$transaction(
	async (tx) => {
		/* ... */
	},
	{
		timeout: TX_TIMEOUT_LONG, // 30s
		maxWait: TX_MAX_WAIT_LONG, // 10s
	},
);
```

Sans override : risque P2024 timeout + rollback partiel.

## Facturation électronique — invariants

Synclune est entrepreneur individuel **micro-entreprise franchise TVA** (Art. 293 B CGI). Calendrier réforme : émission obligatoire au **1ᵉʳ septembre 2027**, réception au **1ᵉʳ septembre 2026**. Les invariants ci-dessous gardent le code conforme aux Art. 286 / 289-I / 272-I CGI, L102 B LPF et L123-22 Code de Commerce.

### Invariants intangibles

1. **Aucune création manuelle de facture** depuis l'admin ou ailleurs. Toute facture (`invoiceNumber`) doit passer par `persist-invoice-number.service.ts`, déclenché uniquement par le webhook `payment_intent.succeeded` (eager via `ensure-invoice-number.service.ts`) ou en lazy fallback dans `app/api/orders/[orderNumber]/invoice/route.ts`. Aucune Server Action ne doit écrire `invoiceNumber` ou `creditNoteNumber`.
2. **Aucun avoir manuel.** `creditNoteNumber` (`A-YYYY-NNNNN`) est généré uniquement par `void-invoice.service.ts`, appelé depuis `cancel-order`, `mark-as-fully-refunded` et le webhook `charge.refunded` (cas remboursement total).
3. **`OrderHistory` est immuable** — pas de `deletedAt`, pas d'`update`, pas de `delete`. Audit trail comptable Art. L123-22, conservation 10 ans.
4. **Snapshots OrderItem figés** au moment du checkout (`productTitle`, `productImageUrl`, `skuColor`, `skuMaterial`, `skuSize`, `price`). Une mutation Product/Sku ne doit jamais modifier un OrderItem existant.
5. **Snapshots adresses figés** sur Order (`billing*`, `shipping*`) au checkout. Le modèle `Address` du client peut évoluer indépendamment.
6. **PDF immuable post-paiement** : `archive-invoice-pdf.service.ts` upload UploadThing + SHA-256 (`Order.invoicePdfHash`). La route `/api/orders/[orderNumber]/invoice` sert le PDF archivé en priorité (régénération seulement en fallback si fetch UploadThing échoue).
7. **Numérotation séquentielle gap-free** : `F-YYYY-NNNNN` pour factures, `A-YYYY-NNNNN` pour avoirs. CHECK constraints DB strictes (`^F-[0-9]{4}-[0-9]{5}$`). Advisory locks Postgres `1_000_000+year` (facture) et `2_000_000+year` (avoir). Sérialisation totale par année.
8. **Pas de vente manuelle / pas de caisse.** Aucune Server Action ne doit créer une commande payée sans passer par Stripe (PaymentIntent). Tout flow alternatif (`recordCashSale`, `createManualOrder`, etc.) requiert validation comptable préalable — sinon risque "logiciel de caisse" NF 525 non conforme.
9. **Pas de mutation manuelle des modèles `EReportingTransaction` / `EReportingBatch`.** Seuls `record-ereporting.service.ts` (hook SALES + REFUND) et les services cron `build-ereporting-batch.service.ts` + `transmit-ereporting-batch.service.ts` peuvent écrire. Aucune Server Action admin ne doit poser un `status: ACCEPTED` manuel ni créer un batch fictif — risque divergence DGFiP + invalidation idempotence transmission.

### Tests régression dédiés

| Test                                                                       | Fichier                                                                                            | Garde                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------- |
| OrderHistory n'a pas `deletedAt`                                           | `modules/orders/services/__tests__/order-history-immutability.regression.test.ts`                  | Audit trail immuable (Art. L123-22) |
| Aucune action admin n'écrit `invoiceNumber`/`creditNoteNumber` directement | `modules/orders/services/__tests__/no-manual-invoice-creation.regression.test.ts`                  | Invariant 1 + 2                     |
| Numérotation : pas de rollover silencieux au-delà de 99999/an              | `modules/orders/services/__tests__/persist-invoice-number.service.test.ts` (sous-suite "overflow") | Invariant 7                         |
| Aucune Server Action ne crée/mute `EReporting*` directement                | `modules/invoices/services/__tests__/no-manual-ereporting-write.regression.test.ts`                | Invariant 9                         |

### Conformité réglementaire (référencement)

| Article                                      | Localisation                                                                                                                                                  | Statut |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Art. 286 CGI — séquentialité gap-free        | `persist-invoice-number.service.ts:50-140` + CHECK DB                                                                                                         | ✓      |
| Art. 289-I CGI — émission à l'encaissement   | `ensure-invoice-number.service.ts:20-46` (ORD-COMPLY-002)                                                                                                     | ✓      |
| Art. 272-I CGI — avoir post-facture          | `void-invoice.service.ts:53-194` (ORD-COMPLY-003)                                                                                                             | ✓      |
| Art. 293 B CGI — mention franchise TVA       | `render-invoice-pdf.ts:235-242`                                                                                                                               | ✓      |
| Art. L102 B LPF — immutabilité 10 ans        | `archive-invoice-pdf.service.ts:22-77` (ORD-COMPLY-005)                                                                                                       | ✓      |
| Art. L123-22 C. com. — audit trail           | `OrderHistory` + `createOrderAuditTx`                                                                                                                         | ✓      |
| Art. 50-0 CGI — CA à l'encaissement          | `export-orders-csv.service.ts:31-60` filtre `paidAt` (ORD-COMPLY-007)                                                                                         | ✓      |
| Réforme 2026-2027 émission structurée        | `render-{facturx,ubl}.ts` + `transmit-invoices.service.ts` + `submit-invoice-by-id.service.ts` (Phase 3++ infrastructure prête, attente provider PDP)         | ⏳     |
| Réforme 2026-2027 e-reporting B2C            | `record-ereporting.service.ts` + `build-ereporting-batch.service.ts` + `transmit-ereporting-batch.service.ts` (Phase 4 livré, dry-run prod tant que flag OFF) | ⏳     |
| CEN EN 16931 validation BR-CO-_ / BR-FR-FX-_ | `validate-facturx.ts` + `validate-ubl.ts` (opt-in via `INVOICE_VALIDATE_XML`)                                                                                 | ⏳     |

Audit conformité complet : `~/.claude/plans/tu-es-un-auditeur-radiant-stonebraker.md` (2026-05-27).
Architecture détaillée, matrices B2C/B2B/B2G, état des phases, feature flags, troubleshooting : `docs/INVOICING.md`.
Procédures opérationnelles alertes admin facturation : `docs/RUNBOOK-INVOICING.md` (audit monitoring 2026-05-28 — EINV-OPS-\*).

## Forms

TanStack Form avec `useAppForm`. Voir `shared/components/forms/` pour les composants de formulaire.

```typescript
const form = useAppForm<MyInput>({
	defaultValues: { name: "" },
	validators: { onChange: schema },
	onSubmit: async ({ value }) => {
		/* ... */
	},
});
```

## Security

- **Rate limiting**: in-memory per-action via `shared/lib/rate-limit.ts` (**fixed counter window** par identifier — un `{count,resetAt}` reset complet à expiry, pas de log d'événements sliding ; 100 req/min IP global + per-action limits). IP extraction Vercel-first : `x-vercel-forwarded-for` → `x-real-ip` → `x-forwarded-for` (les deux premiers sont non-spoofables via l'edge Vercel). Single-instance Node.js : sur Vercel serverless chaque instance a son propre Map, reset au cold-start → protection best-effort contre abus simples, **insuffisant pour DDoS sérieux**. Pour cohérence cross-instance : Upstash Redis ou Arcjet (non installés à ce jour).
- **Validation**: Zod server-side
- **RGPD**: Soft deletes, consent tracking, data export
- **Webhooks**: Stripe signature verification + idempotency + 5-minute anti-replay window
- **Security headers** (next.config.ts): CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Uploads**: UploadThing (server-validated)

## Testing Strategy

### Hiérarchie

| Scope               | Déclencheur                             | Commande                 | Durée cible |
| ------------------- | --------------------------------------- | ------------------------ | ----------- |
| **Critical path**   | Pre-commit (si modules touchés) + CI PR | `pnpm test:critical`     | < 10s       |
| **Full unit suite** | CI PR + push main                       | `pnpm test:coverage`     | ~2 min      |
| **Integration DB**  | Opt-in (`INTEGRATION_DATABASE_URL`)     | `pnpm test:integration`  | ~30s        |
| **Contract Stripe** | Inclus dans full unit suite             | (incluse)                | < 5s        |
| **E2E smoke**       | CI PR + push main                       | `pnpm e2e --grep @smoke` | ~3 min      |
| **E2E complet**     | CI PR + push main (sharded ×4)          | `pnpm e2e`               | ~15 min     |

### Critical path (8 modules)

Les modules `cart`, `orders`, `payments`, `webhooks`, `auth`, `discounts`, `refunds`, `invoices` sont les flows transactionnels revenus/sécurité (le module `invoices` contient les hooks e-reporting SALES + REFUND câblés sur webhook paiement et action refund — toute régression cassant l'agrégation DGFiP est un risque réglementaire). Leurs tests s'exécutent :

- **Pre-commit local** (hook husky) : uniquement si `git diff --cached` contient un fichier sous ces modules — commit instantané sinon.
- **CI** : job `tests-critical` dédié en parallèle de `quality` pour feedback rapide.

### Ajouter une suite au critical path

1. Étendre le glob du script `test:critical` dans `package.json`.
2. Étendre le regex du hook `.husky/pre-commit`.
3. Mettre à jour cette section.

### Conventions de tests

- Fichiers : `<nom>.test.ts(x)` à côté du code ou dans `__tests__/`.
- **Régression locked** : suffixe `<sujet>.regression.test.ts(x)` + JSDoc `@regression <slug>` en tête. Convention : un test régression verrouille une correction de bug précise — toute modif requiert review explicite. Inventaire vivant via `grep -rn "@regression" --include="*.test.ts*"`. Exemples : `webhook-concurrency.regression.test.ts` (P2002 race), `link-history-back.regression.test.tsx` (Vaul `<DrawerClose asChild>` annule navigation `<Link>`).
- **Integration DB** : suffixe `<nom>.integration.test.ts`, runner séparé (`vitest.integration.config.ts`), DB dédiée via `INTEGRATION_DATABASE_URL`. Import du client via `@/test/integration/prisma-client` UNIQUEMENT (jamais `@/shared/lib/prisma` → refus si URL contient "prod"/"production"). Skip silencieux si env vide.
- **Contract Stripe** : `test/contract/stripe-events.test.ts` charge chaque fixture `test/fixtures/stripe/*.json` et vérifie shape + routing via `event-registry.dispatchEvent`. Si Stripe modifie un payload : regénérer via `stripe trigger <type> --print-json`.
- Tags E2E : `@smoke` (flow minimal), `@critical` (paiement/auth).
- Mocks DB : **interdit** sur les tests d'intégration orders/payments (incident historique — divergence mock/prod). Préférer `.integration.test.ts` quand la logique tient sur le comportement DB réel (FOR UPDATE, transactions, contraintes).
- Mock erreurs Prisma : **subclass réelle obligatoire** (`vi.mock("@/app/generated/prisma/client", () => ({ Prisma: { PrismaClientKnownRequestError: <fakeClass> } }))`). Un `Object.assign(new Error(), { code: "P2002" })` n'est PAS `instanceof` correct → test "green for the wrong reason" (incident webhooks-audit-2026-05-17).

## Conventions

| Type        | Convention                            |
| ----------- | ------------------------------------- |
| Files       | `kebab-case.ts`                       |
| Components  | `PascalCase`                          |
| Functions   | `camelCase`                           |
| Constants   | `UPPER_SNAKE_CASE`                    |
| UI text     | French                                |
| Code        | English                               |
| Commits     | `feat:`, `fix:`, `docs:`, `refactor:` |
| Indentation | Tabs                                  |
