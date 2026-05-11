---
title: Patterns Cookbook
version: 2.1.0
last-reviewed: 2026-05-10
purpose: Référence "avant / après" des patterns idiomatiques Synclune
---

# Patterns Cookbook

Snippets de référence pour les règles non-triviales de [`00-standards.md`](./00-standards.md) et [`01-conventions.md`](./01-conventions.md). Chaque snippet est minimal et auto-suffisant.

## Sommaire

- [Cache & Data](#cache--data)
  - [1. Cache wrapper user-scoped](#1-cache-wrapper-user-scoped)
  - [2. Cache tags granulaires](#2-cache-tags-granulaires)
  - [3. updateTag exhaustif après mutation](#3-updatetag-exhaustif-après-mutation)
- [Server Actions](#server-actions)
  - [4. Pattern Server Action complet](#4-pattern-server-action-complet)
  - [5. Validation `validateInput` vs `safeParse` direct](#5-validation-validateinput-vs-safeparse-direct)
  - [6. BusinessError métier](#6-businesserror-métier)
- [React 19](#react-19)
  - [7. `useActionState` (pas `useFormState`)](#7-useactionstate-pas-useformstate)
  - [8. `useOptimistic` correctement compris](#8-useoptimistic-correctement-compris)
  - [9. `ref` as prop (sans `forwardRef`)](#9-ref-as-prop-sans-forwardref)
  - [10. Server Component + `use()`](#10-server-component--use)
  - [11. Suspense parallèles vs `Promise.all`](#11-suspense-parallèles-vs-promiseall)
  - [12. View Transitions cohérentes](#12-view-transitions-cohérentes)
- [Next.js 16.2](#nextjs-162)
  - [13. Async APIs (`cookies`, `headers`, `params`)](#13-async-apis)
  - [14. `generateMetadata` async + parent](#14-generatemetadata-async--parent)
  - [15. `generateStaticParams` populaires](#15-generatestaticparams-populaires)
  - [16. Image responsive sizes](#16-image-responsive-sizes)
  - [17. `next/dynamic` + `ssr:false`](#17-nextdynamic--ssrfalse)
- [TypeScript](#typescript)
  - [18. Discriminated union ActionState](#18-discriminated-union-actionstate)
  - [19. Branded types pour IDs critiques](#19-branded-types-pour-ids-critiques)
  - [20. `z.infer` au lieu de duplication](#20-zinfer-au-lieu-de-duplication)
  - [21. Type predicates (`x is Foo`)](#21-type-predicates)
  - [22. `satisfies` pour inférence stricte](#22-satisfies-pour-inférence-stricte)
- [Prisma](#prisma)
  - [23. Stock atomique check-and-set](#23-stock-atomique-check-and-set)
  - [24. Transaction interactive avec rollback](#24-transaction-interactive-avec-rollback)
  - [25. State machine pure testable](#25-state-machine-pure-testable)
- [Sécurité & Observabilité](#sécurité--observabilité)
  - [26. Sentry tagging webhook](#26-sentry-tagging-webhook)
  - [27. Sentry latency span cron](#27-sentry-latency-span-cron)
  - [28. PII filter beforeSend](#28-pii-filter-beforesend)
- [Forms](#forms)
  - [29. TanStack Form + `useAppForm`](#29-tanstack-form--useappform)
  - [30. Tests sans mock DB (critical path)](#30-tests-sans-mock-db-critical-path)
- [Patterns métier projet](#patterns-métier-projet)
  - [31. Soft delete (`notDeleted` + `softDelete.x()`)](#31-soft-delete)
  - [32. Webhook idempotency Stripe](#32-webhook-idempotency-stripe)
  - [33. Error boundary route + shared](#33-error-boundary)
  - [34. `useFocusFirstError` (a11y)](#34-usefocusfirsterror)
  - [35. Responsive components (Vaul mobile / Radix desktop)](#35-responsive-components)
  - [36. `useHaptic` feedback mobile](#36-usehaptic)

---

## Cache & Data

### 1. Cache wrapper user-scoped

`cookies()` et `headers()` sont incompatibles avec `"use cache"`. Pattern wrapper obligatoire.

```ts
// ❌ Avant : crash build
"use cache";
export async function getCart() {
	const session = await auth(); // ❌ session lit cookies → incompatible
	return prisma.cart.findFirst({
		where: { userId: session.user.id },
	});
}
```

```ts
// ✅ Après : wrapper public + interne caché
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/modules/auth/lib/get-session";
import { prisma } from "@/shared/lib/prisma";

export async function getCart() {
	const session = await getSession();
	return _fetchCart(session?.user.id);
}

async function _fetchCart(userId: string | undefined) {
	"use cache: private";
	cacheLife("checkout");
	cacheTag(`cart-${userId ?? "guest"}`);
	return prisma.cart.findFirst({ where: { userId } });
}
```

---

### 2. Cache tags granulaires

```ts
// ❌ Trop large : invalide tout le catalogue à chaque update produit
cacheTag("products");

// ✅ Granulaire : invalide seulement le produit + collection concernée
cacheTag(`product-${slug}`);
cacheTag(`products-list-${collectionSlug}`);
cacheTag("products-list");
```

---

### 3. updateTag exhaustif après mutation

```ts
// ❌ Avant : oubli sitemap + product-${slug} → stale
import { updateTag } from "next/cache";

await prisma.product.update({ where: { id }, data });
updateTag("products-list");
return success("Mis à jour");
```

```ts
// ✅ Après : invalidation exhaustive
import { updateTag } from "next/cache";

const product = await prisma.product.update({ where: { id }, data });

updateTag("products-list");
updateTag(`product-${product.slug}`);

if (data.collectionId) {
	updateTag(`products-list-${product.collectionSlug}`);
}

if (data.status === "ACTIVE" || data.publishedAt !== undefined) {
	updateTag("sitemap-products");
}

return success("Mis à jour");
```

---

## Server Actions

### 4. Pattern Server Action complet

```ts
"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, success, handleActionError, type ActionState } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { z } from "zod";

const schema = z.object({
	name: z.string().trim().min(1, "Nom requis").max(120),
});

export async function createCollection(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const validation = validateInput(schema, {
		name: formData.get("name"),
	});
	if (!validation.success) return validation.error;

	try {
		const collection = await prisma.collection.create({
			data: validation.data,
		});

		updateTag("collections-list");
		updateTag(`collection-${collection.slug}`);

		return success("Collection créée");
	} catch (e) {
		return handleActionError(e, "Erreur création collection");
	}
}
```

---

### 5. Validation `validateInput` vs `safeParse` direct

Les deux sont valides projet. Préférer `validateInput` pour cohérence du `ActionState` retourné.

```ts
// ✅ validateInput (cohérence retour)
const validation = validateInput(schema, formData);
if (!validation.success) return validation.error; // déjà ActionState

// ✅ safeParse direct (équivalent)
const result = schema.safeParse(formData);
if (!result.success) return error(result.error.errors[0]?.message ?? "...");
```

---

### 6. BusinessError métier

```ts
// shared/lib/actions/business-error.ts (existe déjà)
export class BusinessError extends Error {
	constructor(
		message: string,
		public readonly code: string,
	) {
		super(message);
		this.name = "BusinessError";
	}
}
```

```ts
// ✅ Usage dans service pur
import { BusinessError } from "@/shared/lib/actions";

export async function validateStock(skuId: string, qty: number) {
	const sku = await prisma.sku.findUnique({ where: { id: skuId } });
	if (!sku) throw new BusinessError("SKU introuvable", "SKU_NOT_FOUND");
	if (sku.stock < qty) {
		throw new BusinessError(
			`Stock insuffisant (${sku.stock} dispo, ${qty} demandés)`,
			"INSUFFICIENT_STOCK",
		);
	}
}

// handleActionError catch BusinessError et retourne error() formaté UI
```

---

## React 19

### 7. `useActionState` (pas `useFormState`)

```tsx
// ❌ Avant (Legacy react-dom)
"use client";
import { useFormState } from "react-dom";

const [state, formAction] = useFormState(serverAction, undefined);
```

```tsx
// ✅ Après (React 19 stable)
"use client";
import { useActionState } from "react";

const [state, formAction, isPending] = useActionState(serverAction, undefined);
//                       ^^^^^^^^^^ bonus : pending intégré, plus besoin de useFormStatus à part
```

---

### 8. `useOptimistic` correctement compris

> **React ne fait pas de "rollback explicite"** — c'est implicite : quand l'action serveur retourne, React réconcilie l'optimistic state avec le state réel. Pas de `if (error) setBack(oldValue)` à écrire.

```tsx
"use client";
import { useOptimistic } from "react";

function WishlistHeart({ isLiked, action }: Props) {
	const [optimistic, setOptimistic] = useOptimistic(isLiked);

	return (
		<form
			action={async (formData) => {
				setOptimistic(!optimistic);
				await action(formData); // si throw, React revient à isLiked initial
			}}
		>
			<button aria-pressed={optimistic} aria-label={optimistic ? "Retirer" : "Ajouter"}>
				<Heart className={optimistic ? "fill-red-500" : ""} />
			</button>
		</form>
	);
}
```

---

### 9. `ref` as prop (sans `forwardRef`)

```tsx
// ❌ Avant (React 18)
import { forwardRef } from "react";

const Button = forwardRef<HTMLButtonElement, Props>(({ children, ...props }, ref) => (
	<button ref={ref} {...props}>
		{children}
	</button>
));
```

```tsx
// ✅ Après (React 19)
type Props = ComponentProps<"button"> & { ref?: Ref<HTMLButtonElement> };

function Button({ ref, children, ...props }: Props) {
	return (
		<button ref={ref} {...props}>
			{children}
		</button>
	);
}
```

---

### 10. Server Component + `use()`

Pattern : passer une promise depuis un Server Component vers un Client Component qui l'unwrap avec `use()` (suspend).

```tsx
// app/(shop)/produits/[slug]/page.tsx (Server Component) — illustratif
import { ProductReviews } from "./product-reviews";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const reviewsPromise = getReviews(slug); // ne pas await → passer la promise

	return (
		<Suspense fallback={<ReviewsSkeleton />}>
			<ProductReviews promise={reviewsPromise} />
		</Suspense>
	);
}
```

```tsx
// product-reviews.tsx (Client Component)
"use client";
import { use } from "react";

export function ProductReviews({ promise }: { promise: Promise<Review[]> }) {
	const reviews = use(promise); // suspend automatiquement
	return (
		<ul>
			{reviews.map((r) => (
				<li key={r.id}>{r.text}</li>
			))}
		</ul>
	);
}
```

---

### 11. Suspense parallèles vs `Promise.all`

```tsx
// ❌ Avant : Promise.all attend tout avant de rendre
export default async function Dashboard() {
	const [vat, revenue, orders] = await Promise.all([
		getVatStats(),
		getRevenueStats(),
		getOrderStats(),
	]);

	return (
		<>
			<VatCard data={vat} />
			<RevenueCard data={revenue} />
			<OrderCard data={orders} />
		</>
	);
}
```

```tsx
// ✅ Après : Suspense parallèles streament chaque card dès prêt
export default function Dashboard() {
	return (
		<>
			<Suspense fallback={<VatSkeleton />}>
				<VatCard /> {/* fetch interne */}
			</Suspense>
			<Suspense fallback={<RevenueSkeleton />}>
				<RevenueCard />
			</Suspense>
			<Suspense fallback={<OrderSkeleton />}>
				<OrderCard />
			</Suspense>
		</>
	);
}
```

---

### 12. View Transitions cohérentes

Le `viewTransitionName` doit matcher entre listing et détail.

```tsx
// listing
<Link href={`/produits/${product.slug}`}>
  <article style={{ viewTransitionName: `product-${product.slug}` }}>
    <Image ... />
  </article>
</Link>
```

```tsx
// detail
<article style={{ viewTransitionName: `product-${product.slug}` }}>
  <Image ... />
  <h1>{product.name}</h1>
</article>
```

```css
/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
	::view-transition-group(*) {
		animation: none !important;
	}
}
```

---

## Next.js 16.2

### 13. Async APIs

```ts
// ❌ Avant (Next.js 14-15)
const cookieStore = cookies();
const headerList = headers();
function Page({ params }: { params: { slug: string } }) {
	const slug = params.slug;
}
```

```ts
// ✅ Après (Next.js 16+ build break sinon)
const cookieStore = await cookies();
const headerList = await headers();
async function Page({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
}
```

Codemod : `pnpm dlx @next/codemod@latest next-async-request-api .`

---

### 14. `generateMetadata` async + parent

```ts
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
	params: Promise<{ slug: string }>;
};

export async function generateMetadata(
	{ params }: Props,
	parent: ResolvingMetadata,
): Promise<Metadata> {
	const { slug } = await params;
	const product = await getProduct(slug);
	if (!product) return { title: "Introuvable" };

	const previousImages = (await parent).openGraph?.images ?? [];

	return {
		title: `${product.name} | Synclune`,
		description: product.description,
		alternates: { canonical: `/produits/${slug}` },
		openGraph: {
			title: product.name,
			images: [product.cover, ...previousImages],
			type: "product",
		},
		twitter: { card: "summary_large_image" },
	};
}
```

---

### 15. `generateStaticParams` populaires

```ts
// app/produits/[slug]/page.tsx
export async function generateStaticParams() {
	const top = await prisma.product.findMany({
		where: { status: "ACTIVE", publishedAt: { not: null } },
		orderBy: { viewsCount: "desc" },
		take: 100,
		select: { slug: true },
	});
	return top.map(({ slug }) => ({ slug }));
}
```

---

### 16. Image responsive sizes

```tsx
// ❌ Avant : pas de sizes → bandwidth gaspillé
<Image src={cover} alt={alt} width={1200} height={1200} />
```

```tsx
// ✅ Après : sizes adapté à la grille
<Image
	src={cover}
	alt={alt} // descriptif, pas "image"
	width={1200}
	height={1200}
	sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
	placeholder="blur"
	blurDataURL={cover.blurDataUrl}
	priority={index === 0} // LCP only
	fetchPriority={index === 0 ? "high" : "auto"}
/>
```

---

### 17. `next/dynamic` + `ssr:false`

```tsx
// ❌ Avant : import direct → bundle initial alourdi
import { Lightbox } from "yet-another-react-lightbox";
```

```tsx
// ✅ Après : code-split + skeleton
import dynamic from "next/dynamic";

const Lightbox = dynamic(() => import("yet-another-react-lightbox").then((mod) => mod.Lightbox), {
	ssr: false,
	loading: () => <LightboxSkeleton />,
});
```

---

## TypeScript

### 18. Discriminated union ActionState

```ts
// ❌ Avant : 3 booléens parallèles, états impossibles permis
type ActionState = {
	isLoading: boolean;
	isError: boolean;
	data?: T;
	error?: string;
};
// Permet: { isLoading: true, isError: true, data: ..., error: ... } — incohérent
```

```ts
// ✅ Après : discriminated union — états mutuellement exclusifs
type ActionState<T = void> =
	| { status: "idle" }
	| { status: "pending" }
	| { status: "success"; data: T; message?: string }
	| { status: "error"; message: string; fields?: Record<string, string[]> };

// Usage :
if (state.status === "error") {
	// TS sait que state.message existe
}
```

---

### 19. Branded types pour IDs critiques

```ts
// ❌ Avant : confusion userId / customerId Stripe possible
function getOrder(userId: string, customerId: string) { ... }
getOrder("cus_abc", "user_xyz") // ❌ inversé, compile silencieusement
```

```ts
// ✅ Après : branded
type UserId = string & { readonly __brand: "UserId" }
type StripeCustomerId = string & { readonly __brand: "StripeCustomerId" }

function asUserId(s: string): UserId { return s as UserId }
function asStripeCustomerId(s: string): StripeCustomerId { return s as StripeCustomerId }

function getOrder(userId: UserId, customerId: StripeCustomerId) { ... }
getOrder("cus_abc", "user_xyz") // ❌ Type error
getOrder(asUserId(user.id), asStripeCustomerId(customer.id)) // ✅
```

> **Trade-off** : friction au cast à la frontière. Réserver aux IDs souvent confondus.

---

### 20. `z.infer` au lieu de duplication

```ts
// ❌ Avant : type manuel + schema → drift
type CreateProductInput = {
	name: string;
	price: number;
	description?: string;
};

const createProductSchema = z.object({
	name: z.string().min(1),
	price: z.number().positive(),
	description: z.string().optional(),
});
// Si on ajoute un champ au schema, on oublie le type → bug
```

```ts
// ✅ Après : source unique
const createProductSchema = z.object({
	name: z.string().min(1),
	price: z.number().positive(),
	description: z.string().optional(),
});

type CreateProductInput = z.infer<typeof createProductSchema>;
```

---

### 21. Type predicates

```ts
// ❌ Avant : cast non vérifié
function getOrderTotal(item: unknown): number {
	return (item as Order).total; // crash possible
}
```

```ts
// ✅ Après : type predicate
function isOrder(x: unknown): x is Order {
	return (
		typeof x === "object" && x !== null && "id" in x && "total" in x && typeof x.total === "number"
	);
}

function getOrderTotal(item: unknown): number {
	if (!isOrder(item)) throw new Error("Not an order");
	return item.total; // TS sait que item est Order
}
```

---

### 22. `satisfies` pour inférence stricte

```ts
// ❌ Avant : type lose l'inférence littérale
const config: Record<string, { ttl: number }> = {
	catalog: { ttl: 900 },
	reference: { ttl: 86400 },
};
config.catalog.ttl; // ✅ number — mais on perd "catalog" comme clé littérale
```

```ts
// ✅ Après : satisfies préserve la littéralité
const config = {
	catalog: { ttl: 900 },
	reference: { ttl: 86400 },
} satisfies Record<string, { ttl: number }>;

config.catalog.ttl; // ✅ number
type Profile = keyof typeof config; // "catalog" | "reference"
```

---

## Prisma

### 23. Stock atomique check-and-set

```ts
// ❌ Avant : read-then-write (race condition)
const sku = await prisma.sku.findUnique({ where: { id } });
if (sku.stock < qty) throw new BusinessError("...");
await prisma.sku.update({
	where: { id },
	data: { stock: sku.stock - qty },
});
// ❌ Entre read et update, un autre thread peut décrémenter
```

```ts
// ✅ Après : check-and-set Prisma optimistic
try {
	await prisma.sku.update({
		where: {
			id,
			stock: { gte: qty }, // check dans WHERE = atomique
		},
		data: { stock: { decrement: qty } },
	});
} catch (e) {
	// P2025 = no record matched (stock < qty OU id absent)
	if (e.code === "P2025") {
		throw new BusinessError("Stock insuffisant", "INSUFFICIENT_STOCK");
	}
	throw e;
}
```

---

### 24. Transaction interactive avec rollback

```ts
// ✅ Stock + order + discount usage atomique
await prisma.$transaction(
	async (tx) => {
		// 1. Lock & decrement stock
		await tx.sku.update({
			where: { id: skuId, stock: { gte: qty } },
			data: { stock: { decrement: qty } },
		});

		// 2. Create order
		const order = await tx.order.create({ data: orderData });

		// 3. Increment discount usage si applicable
		if (discountId) {
			await tx.discount.update({
				where: { id: discountId, usageCount: { lt: usageLimit } },
				data: { usageCount: { increment: 1 } },
			});
		}

		return order;
	},
	{
		isolationLevel: "Serializable", // pour cas critique race
	},
);
// Toute exception → rollback automatique des 3 mutations
```

---

### 25. State machine pure testable

```ts
// modules/orders/services/order-status-validation.service.ts
import { OrderStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
	PENDING: ["PAID", "CANCELLED"],
	PAID: ["SHIPPED", "REFUNDED", "CANCELLED"],
	SHIPPED: ["DELIVERED", "RETURNED"],
	DELIVERED: ["RETURNED"],
	CANCELLED: [],
	REFUNDED: [],
	RETURNED: [],
} as const;

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
	return VALID_TRANSITIONS[from].includes(to);
}

// Tests
import { describe, it, expect } from "vitest";

describe("canTransition", () => {
	it.each([
		["PENDING", "PAID", true],
		["PENDING", "DELIVERED", false],
		["DELIVERED", "RETURNED", true],
		["CANCELLED", "PAID", false],
	])("transition %s → %s = %s", (from, to, expected) => {
		expect(canTransition(from, to)).toBe(expected);
	});
});
```

---

## Sécurité & Observabilité

### 26. Sentry tagging webhook

```ts
// modules/webhooks/utils/capture-webhook-error.ts
import * as Sentry from "@sentry/nextjs";

export function captureWebhookError(
	error: unknown,
	context: {
		webhookHandler: string;
		eventType: string;
		orderId?: string;
		paymentIntentId?: string;
		refundId?: string;
	},
) {
	Sentry.withScope((scope) => {
		scope.setTag("webhookHandler", context.webhookHandler);
		scope.setTag("eventType", context.eventType);
		scope.setLevel("error");
		scope.setFingerprint([context.webhookHandler, context.eventType]);
		scope.setContext("business", {
			orderId: context.orderId,
			paymentIntentId: context.paymentIntentId,
			refundId: context.refundId,
		});
		Sentry.captureException(error);
	});
}
```

---

### 27. Sentry latency span cron

```ts
// modules/cron/lib/with-cron-guard.ts
import * as Sentry from "@sentry/nextjs";

export async function withCronGuard<T>(
	jobName: string,
	fn: () => Promise<{ processed: number; errored: number; skipped: number }>,
): Promise<T> {
	return Sentry.startSpan({ name: `cron.${jobName}`, attributes: { jobName } }, async (span) => {
		try {
			const result = await fn();
			span?.setAttribute("processed_count", result.processed);
			span?.setAttribute("errored_count", result.errored);
			span?.setAttribute("skipped_count", result.skipped);
			return result as T;
		} catch (e) {
			Sentry.withScope((scope) => {
				scope.setTag("cronJob", jobName);
				scope.setLevel("error");
				scope.setFingerprint(["cron", jobName]);
				Sentry.captureException(e);
			});
			throw e;
		}
	});
}
```

---

### 28. PII filter beforeSend

```ts
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

const PII_KEYS = new Set([
	"email",
	"password",
	"token",
	"authorization",
	"cookie",
	"set-cookie",
	"iban",
	"pan",
	"card_number",
	"address",
	"phone",
	"ip",
	"ip_address",
]);

function scrubPII<T extends object>(obj: T): T {
	const out = { ...obj };
	for (const key of Object.keys(out)) {
		if (PII_KEYS.has(key.toLowerCase())) {
			(out as Record<string, unknown>)[key] = "[Scrubbed]";
		}
	}
	return out;
}

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	tracesSampleRate: 0.1,
	beforeSend(event) {
		if (event.user) event.user = scrubPII(event.user);
		if (event.request?.headers) event.request.headers = scrubPII(event.request.headers);
		if (event.request?.cookies) delete event.request.cookies;
		if (event.extra) event.extra = scrubPII(event.extra);
		return event;
	},
});
```

---

## Forms

### 29. TanStack Form + `useAppForm`

```tsx
"use client";

import { useAppForm } from "@/shared/hooks/use-app-form";
import { z } from "zod";

const schema = z.object({
	name: z.string().trim().min(1, "Nom requis"),
	email: z.string().email("Email invalide"),
});

type Input = z.infer<typeof schema>;

export function ContactForm() {
	const form = useAppForm<Input>({
		defaultValues: { name: "", email: "" },
		validators: { onChange: schema },
		onSubmit: async ({ value }) => {
			const result = await sendContactAction(value);
			if (result.status === "error") throw new Error(result.message);
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.Field name="name">
				{(field) => (
					<>
						<label htmlFor={field.name}>Nom</label>
						<input
							id={field.name}
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							aria-invalid={field.state.meta.errors.length > 0}
							aria-describedby={`${field.name}-error`}
							autoComplete="name"
							autoCapitalize="words"
							enterKeyHint="next"
						/>
						{field.state.meta.errors.length > 0 && (
							<p id={`${field.name}-error`} role="alert">
								{field.state.meta.errors[0]}
							</p>
						)}
					</>
				)}
			</form.Field>
			{/* idem email */}
			<button type="submit" disabled={form.state.isSubmitting}>
				Envoyer
			</button>
			<p aria-live="polite" className="sr-only">
				{form.state.isSubmitSuccessful ? "Message envoyé" : ""}
			</p>
		</form>
	);
}
```

---

### 30. Tests sans mock DB (critical path)

```ts
// modules/orders/actions/__tests__/cancel-order.test.ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import { cancelOrder } from "@/modules/orders/actions/cancel-order";

describe("cancelOrder integration", () => {
	let orderId: string;

	beforeEach(async () => {
		// Real DB (test schema) — pas de mock
		const order = await prisma.order.create({
			data: { /* ... */ status: "PENDING" },
		});
		orderId = order.id;
	});

	afterAll(async () => {
		await prisma.order.deleteMany({
			where: {
				/* test marker */
			},
		});
	});

	it("restore stock + transition CANCELLED + audit log", async () => {
		const result = await cancelOrder(undefined, makeFormData({ id: orderId }));

		expect(result.status).toBe("success");

		const order = await prisma.order.findUnique({ where: { id: orderId } });
		expect(order?.status).toBe("CANCELLED");

		const audit = await prisma.orderAuditLog.findFirst({ where: { orderId } });
		expect(audit?.action).toBe("CANCELLED");
	});
});
```

> Pour critical path (`cart`/`orders`/`payments`/`webhooks`/`auth`/`discounts`/`refunds`) : DB réelle obligatoire (incident historique mock/prod divergence).

---

## Patterns métier projet

### 31. Soft delete

`deletedAt` au lieu de `DELETE`. Retention 10 ans factures (loi anti-fraude TVA), grace period 30j account deletion (RGPD). Hard-delete final via cron `hard-delete-retention`.

```ts
// shared/lib/prisma — helpers projet
import { notDeleted, softDelete } from "@/shared/lib/prisma";

// Lecture : exclure soft-deleted (à appliquer dans CHAQUE data/)
const orders = await prisma.order.findMany({
	where: { ...notDeleted, userId },
});

// Mutation : marquer deletedAt
await softDelete.order(orderId);
// = await prisma.order.update({ where: { id: orderId }, data: { deletedAt: new Date() } })
```

```ts
// ❌ Anti-pattern : oublier notDeleted dans data/
async function _fetchOrders(userId: string) {
	"use cache";
	cacheLife("user");
	cacheTag(`orders-${userId}`);
	return prisma.order.findMany({ where: { userId } }); // ← bug : remonte les soft-deleted
}

// ✅ Correct
async function _fetchOrders(userId: string) {
	"use cache";
	cacheLife("user");
	cacheTag(`orders-${userId}`);
	return prisma.order.findMany({ where: { ...notDeleted, userId } });
}
```

> Modèles concernés : tout ce qui est soumis à RGPD ou retention légale. Pas les référentiels (colors/materials/types — `isActive` à la place).

---

### 32. Webhook idempotency Stripe

3 couches de défense : signature HMAC + table `WebhookEvent` (eventId unique) + fenêtre anti-replay 5 minutes.

```ts
// app/api/webhooks/stripe/route.ts (squelette)
import { stripe } from "@/shared/lib/stripe";
import { prisma } from "@/shared/lib/prisma";
import { headers } from "next/headers";
import { captureWebhookError } from "@/modules/webhooks/utils/capture-webhook-error";

const REPLAY_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
	const sig = (await headers()).get("stripe-signature");
	if (!sig) return new Response("missing signature", { status: 400 });

	const raw = await req.text(); // ⚠ AVANT JSON.parse — sinon signature invalide
	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
	} catch {
		return new Response("invalid signature", { status: 400 });
	}

	// Anti-replay : event créé il y a > 5min → ignoré (Stripe ne re-livre pas hors retry)
	if (Date.now() - event.created * 1000 > REPLAY_WINDOW_MS) {
		return new Response("event too old", { status: 410 });
	}

	// Idempotency DB : 1 event = 1 traitement (eventId @unique sur WebhookEvent)
	try {
		await prisma.webhookEvent.create({
			data: { eventId: event.id, type: event.type, payload: event.data.object as object },
		});
	} catch (e) {
		// P2002 = unique violation = déjà traité → 200 (sinon Stripe retry infini)
		return new Response("already processed", { status: 200 });
	}

	try {
		await dispatchHandler(event);
		return new Response("ok", { status: 200 });
	} catch (e) {
		captureWebhookError(e, { handler: "stripe-route", eventType: event.type, eventId: event.id });
		throw e; // Stripe retry policy s'applique
	}
}
```

> Voir aussi `modules/webhooks/utils/capture-webhook-error.ts` (pattern 26 Sentry tagging).

---

### 33. Error boundary

3 niveaux : route (`error.tsx`), shared (`AdminListErrorBoundary`), root (`global-error.tsx`).

```tsx
// app/admin/<section>/error.tsx — route boundary
"use client";
import { AdminListErrorBoundary } from "@/shared/components/error-boundaries/admin-list-error-boundary";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return <AdminListErrorBoundary error={error} reset={reset} scope="<section>" />;
}
```

```tsx
// app/global-error.tsx — racine (RSC inactif → "use client" obligatoire)
"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
	useEffect(() => {
		Sentry.captureException(error, { tags: { boundary: "global-error" } });
	}, [error]);
	return (
		<html lang="fr">
			<body>{/* fallback ultra-minimal — pas de RSC ici */}</body>
		</html>
	);
}
```

> Couverture cible : 1 `error.tsx` par groupe de routes (`(account)/(auth)/(legal)/(shop)/admin`) + global-error.tsx racine. Pas de boundary par page (sauf cas critique isolé).

---

### 34. `useFocusFirstError`

A11y : focus automatique sur 1er field invalide après submit. Évite scroll manuel utilisateur. Hook projet déjà câblé dans `useAppForm`.

```tsx
import { useAppForm } from "@/shared/hooks/use-app-form";
// useFocusFirstError est inclus — pas besoin d'opt-in

const form = useAppForm<MyInput>({
	defaultValues: { email: "", password: "" },
	validators: { onChange: schema },
	onSubmit: async ({ value }) => {
		/* ... */
	},
});
// → si soumission échoue avec 1+ errors, focus.first()
```

```tsx
// ❌ Anti-pattern : useForm direct (pas de focus first error)
import { useForm } from "@tanstack/react-form"; // ← perte de l'a11y

// ✅ Correct
import { useAppForm } from "@/shared/hooks/use-app-form";
```

> 22+ forms projet utilisent `useAppForm`. Ne pas réinventer.

---

### 35. Responsive components

3 composants Vaul mobile / Radix desktop (breakpoint via `useMediaQuery`) + 1 sticky footer.

```tsx
// shared/components/responsive — patterns projet
import { ResponsiveDialog } from "@/shared/components/responsive/responsive-dialog";
import { ResponsiveAlertDialog } from "@/shared/components/responsive/responsive-alert-dialog";
import { ResponsiveActionMenu } from "@/shared/components/responsive/responsive-action-menu";
import { AdminFormFooter } from "@/shared/components/admin/admin-form-footer";
```

| Composant               | Mobile (Vaul drawer)                       | Desktop (Radix)    |
| ----------------------- | ------------------------------------------ | ------------------ |
| `ResponsiveDialog`      | Drawer bottom                              | Dialog centré      |
| `ResponsiveAlertDialog` | Drawer bottom                              | AlertDialog centré |
| `ResponsiveActionMenu`  | Drawer bottom (3-dots → ActionSheet)       | DropdownMenu       |
| `AdminFormFooter`       | Sticky bottom safe-area + bottom-bar-aware | Inline classique   |

```tsx
// AdminFormFooter exemple
import { AdminFormFooter } from "@/shared/components/admin/admin-form-footer";

<form onSubmit={handleSubmit}>
	{/* fields */}
	<AdminFormFooter
		primary={{ label: "Enregistrer", isPending, disabled: !isDirty }}
		secondary={{ label: "Annuler", href: "/admin/.." }}
	/>
</form>;
// → mobile : sticky bottom avec pb-[env(safe-area-inset-bottom)] + bottom-bar offset
// → desktop : footer inline classique
```

> Pas de `Dialog` Radix direct sur formulaire admin mobile — toujours `AdminFormFooter`. Refus owner : ne pas réinventer le pattern (memory feedback `feedback_native_patterns`).

---

### 36. `useHaptic`

Vibration API mobile (Android + iOS Safari récent). 3 intensités projet : `light`, `medium`, `error`.

```tsx
import { useHaptic } from "@/shared/hooks/use-haptic";

function AddToCartButton({ skuId }: { skuId: string }) {
	const triggerHaptic = useHaptic();

	return (
		<button
			onClick={() => {
				triggerHaptic("light"); // tap normal
				addToCart(skuId);
			}}
		>
			Ajouter
		</button>
	);
}
```

| Intensité     | Quand                                 | Exemples projet                            |
| ------------- | ------------------------------------- | ------------------------------------------ |
| `"light"`     | Tap normal, sélection, navigation     | Carousel dot, button primary, link tap     |
| `"medium"`    | Long-press, action significative      | Effacer recent-search, drag-handle release |
| `"error"`     | Form submit error, validation rejetée | Toast error, AlertDialog destructive       |
| `"selection"` | Toggle filtre, pill activée           | QuickTagPills, sort-drawer option          |

```tsx
// ❌ Anti-pattern : navigator.vibrate direct (pas de respect user prefs)
navigator.vibrate(10);

// ✅ Correct : useHaptic respecte `prefers-reduced-motion` + capability detection
const triggerHaptic = useHaptic();
triggerHaptic("light");
```

> Toujours sur événement utilisateur direct (jamais en `useEffect`/auto). Sinon iOS bloque silencieusement.
