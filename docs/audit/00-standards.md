---
title: Standards externes
version: 2.0.0
applies-to: Next.js 16.2 / React 19.2 / TypeScript 5.x / WCAG 2.1 AA / OWASP Top 10
last-reviewed: 2026-05-10
---

# Standards externes

Référence des standards techniques **externes** (frameworks, langages, normes). Ces règles évoluent au rythme des releases tierces, indépendamment des conventions Synclune.

> Cycle de vie distinct de [`01-conventions.md`](./01-conventions.md). Bump Next.js minor → relire ce fichier seulement.

## Sommaire

- [Next.js 16.2 — Cache Components & PPR](#nextjs-162--cache-components--ppr)
- [Next.js 16.2 — Async APIs](#nextjs-162--async-apis)
- [Next.js 16.2 — Routing & Metadata](#nextjs-162--routing--metadata)
- [Next.js 16.2 — Images, Fonts, Bundle](#nextjs-162--images-fonts-bundle)
- [React 19.2](#react-192)
- [TypeScript strict](#typescript-strict)
- [Tailwind 4 & shadcn/ui](#tailwind-4--shadcnui)
- [Accessibilité WCAG 2.1 AA](#accessibilité-wcag-21-aa)
- [Sécurité OWASP Top 10](#sécurité-owasp-top-10)
- [Performance — Core Web Vitals](#performance--core-web-vitals)
- [Tests](#tests)

## Next.js 16.2 — Cache Components & PPR

### Cache Components (`"use cache"`)

| Règle                                                                                                      | Comment vérifier                                                                             |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `"use cache"` uniquement sur fonctions pures (pas de `cookies()`/`headers()`)                              | grep `"use cache"` puis lire le corps                                                        |
| Wrapper pattern obligatoire pour user data : public lit session → délègue à interne `"use cache: private"` | Voir `patterns-cookbook.md` § Cache wrapper user-scoped                                      |
| `cacheLife(profile)` cohérent avec `next.config.ts` (`checkout` / `user` / `catalog` / `reference`)        | grep `cacheLife\(`                                                                           |
| `cacheTag` granulaire : `entité-${id}` ou `collection-${slug}`, pas tag global                             | Audit chaque tag — éviter `"products"` seul si `products-list-${collectionSlug}` plus précis |
| `updateTag` exhaustif après mutation (listings + détail + sitemap + cross-module)                          | Tracer les tags impactés via [audit transversal](./03-cross-module.md)                       |

### PPR (Partial Prerendering)

| Règle                                                                                                       | Comment vérifier                                           |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Suspense boundary obligatoire autour de chaque slot dynamique (cookies/headers/auth-dépendant)              | Lire chaque page.tsx d'une route dynamique                 |
| Fallback skeleton fidèle : layout exact (CLS = 0)                                                           | DevTools Performance → Layout Shifts                       |
| Fetchers parallèles : Suspense parallèles préférés à `Promise.all` (streaming dès prêt vs render-after-all) | grep `Promise.all\(` dans pages — chaque candidate à split |

### Loading / Error / Not-Found UI

| Règle                                                                       | Note                                               |
| --------------------------------------------------------------------------- | -------------------------------------------------- |
| `loading.tsx` miroir exact du layout (padding, grid, hauteurs)              | Test : ouvrir page lentement et vérifier zéro saut |
| `error.tsx` `"use client"` sur chaque hub avec `reset()` exposé dans le JSX | Chaque sous-route devrait pouvoir reset isolément  |
| `global-error.tsx` racine avec Sentry tags + reset                          | Capture les erreurs hors layout                    |
| `not-found.tsx` scopé (route-level) plutôt qu'un seul global                | Améliore UX 404 contextuelles                      |

## Next.js 16.2 — Async APIs

Toutes ces APIs retournent désormais une `Promise` :

```ts
// ✅ Correct
const cookieStore = await cookies();
const headerList = await headers();
const { id } = await params;
const { search } = await searchParams;

// ❌ Build break
const cookieStore = cookies(); // sync access supprimé Next.js 16
```

| Règle                                                                    | Comment vérifier                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------- |
| Aucun accès sync à `cookies()` / `headers()` / `params` / `searchParams` | grep + ESLint `next/...` rules                           |
| Codemod `next-async-request-api` lancé après chaque bump                 | `pnpm dlx @next/codemod@latest next-async-request-api .` |

## Next.js 16.2 — Routing & Metadata

| Règle                                                                 | Détails                                                     |
| --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `generateMetadata` async, hérite parent                               | `parent: ResolvingMetadata` argument utilisé pour merger    |
| OG / Twitter cards complètes                                          | `openGraph`, `twitter`, `images` (1200×630), locale `fr_FR` |
| Canonical URL                                                         | `alternates: { canonical: ... }` — éviter contenu dupliqué  |
| Alternates pagination / i18n si applicable                            | `alternates: { languages: { ... } }`                        |
| `generateStaticParams` sur `[slug]` populaires                        | Pré-compile top N (catalog/produits, collections)           |
| Route Handlers : runtime explicite (`runtime = 'nodejs'` ou `'edge'`) | Stripe/Prisma → `nodejs` obligatoire                        |
| `revalidate` exporté si page nécessite ISR                            | Sinon Cache Components gère                                 |
| Speculation Rules                                                     | **REFUSÉ par owner** — ne pas proposer                      |

## Next.js 16.2 — Images, Fonts, Bundle

### Images

```tsx
<Image
  src={src}
  alt={alt}                      // descriptif, pas "image"
  width={...} height={...}       // ou fill avec parent positionné
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  priority={isLCP}               // LCP only, jamais below-the-fold
  fetchPriority={isLCP ? "high" : "auto"}
  placeholder="blur"
  blurDataURL={generated}        // upload-time, pas runtime
/>
```

| Règle                                                      | Vérification                |
| ---------------------------------------------------------- | --------------------------- |
| `sizes` prop responsive obligatoire (sauf `width` fixe)    | grep `<Image` sans `sizes=` |
| `priority` sur LCP uniquement                              | DevTools Lighthouse         |
| AVIF / WebP servis (cf. `next.config.ts` `images.formats`) | Network tab                 |

### Fonts

```ts
// shared/styles/fonts.ts
import { Fraunces } from "next/font/google";

export const fraunces = Fraunces({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-fraunces",
});
```

| Règle                                                  |                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `next/font` (local ou Google) — pas de `<link>` manuel | Évite layout shift FOUT                                                       |
| `display: "swap"`                                      |                                                                               |
| `variable: "--font-..."` exposée pour Tailwind         | Cohérent avec `tailwind.config`                                               |
| Preload uniquement layout root                         | `preload: true` par défaut, désactiver `preload: false` sur fonts secondaires |

### Bundle

```ts
const Lightbox = dynamic(() => import("./lightbox"), { ssr: false });
```

| Règle                                                                                            |                                 |
| ------------------------------------------------------------------------------------------------ | ------------------------------- |
| `next/dynamic` + `ssr: false` pour composants client-only lourds (lightbox, charts, MultiSelect) |                                 |
| Pas de barrel imports lourds (`import { everything } from "lucide-react"`)                       | Préférer imports nommés directs |
| `pnpm size` sous budget                                                                          | Voir `package.json` size-limit  |

## React 19.2

### Compilateur React 19 — INTERDICTION mémo manuelle

```tsx
// ❌ INTERDIT
const memoized = useMemo(() => compute(x), [x])
const cb = useCallback(() => doX(), [])
const Memo = React.memo(MyComp)

// ✅ Le compilateur React 19 mémoïse automatiquement
const value = compute(x)
function handler() { doX() }
function MyComp(...) { ... }
```

Raison : la mémo manuelle est du bruit, peut être contre-productive (closure sur stale value), et empêche l'analyse compilateur.

### Server Components / Client Components

| Règle                                                                      |                                                                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Server Components par défaut                                               | `"use client"` UNIQUEMENT si event handler, hook state/effect, browser API, ou provider de contexte     |
| Boundaries client minimales                                                | Descendre `"use client"` le plus bas possible dans l'arbre. Wrappers RSC en haut pour streamer le data. |
| Pas de `import { useState } from "react"` dans fichier sans `"use client"` | Build break                                                                                             |

### Server Actions

```tsx
// Composant client
"use client";
import { useActionState } from "react";

const [state, formAction, isPending] = useActionState(serverAction, undefined);

// useFormState (legacy react-dom) → utiliser useActionState (react)
```

| Règle                                                                 |                                                                                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `useActionState` (`react`) — PAS `useFormState` (`react-dom`, legacy) | grep `useFormState` → migration                                                                                  |
| `useFormStatus` pour pending dans bouton enfant du form               | Permet `<SubmitButton />` réutilisable sans prop drilling                                                        |
| `useOptimistic` pour UX réactive                                      | React réconcilie automatiquement quand l'action serveur retourne (pas de "rollback explicite" — c'est implicite) |

### Transitions

```tsx
const [isPending, startTransition] = useTransition();

startTransition(() => {
	router.push("/somewhere");
});
```

### `ref` as prop (React 19)

```tsx
// ❌ Plus besoin de forwardRef pour function components
const Button = forwardRef<HTMLButtonElement, Props>((props, ref) => ...)

// ✅ ref est une prop normale
function Button({ ref, ...props }: Props & { ref?: Ref<HTMLButtonElement> }) {
  return <button ref={ref} {...props} />
}
```

> Class components : `forwardRef` toujours requis (cas extrêmement rare).

### `use()` hook

```tsx
// Server Component parent passe une promise au Client Component enfant
<ClientChild promise={dataPromise} />;

// Client Component utilise use() pour unwrap (suspend automatiquement)
("use client");
import { use } from "react";

function ClientChild({ promise }: { promise: Promise<Data> }) {
	const data = use(promise);
	return <div>{data.x}</div>;
}
```

### `<Activity>` (React 19.2 stable)

Préserve l'état d'un sous-arbre invisible (ex. onglet fermé, panneau caché). Candidat sur dialogs onglets ou drawers à plusieurs vues.

```tsx
<Activity mode={isVisible ? "visible" : "hidden"}>
	<ExpensiveTab />
</Activity>
```

### View Transitions

```tsx
import { unstable_ViewTransition as ViewTransition } from "react";

<ViewTransition name={`product-${slug}`}>
	<ProductCard />
</ViewTransition>;
```

| Règle                                          |                                                                |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `viewTransitionName` cohérent listing ↔ détail | Même string des deux côtés                                     |
| `prefers-reduced-motion` respecté              | CSS `@media (prefers-reduced-motion)` désactive les animations |

### Hydration

| Règle                                                        |                                                                                                                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zéro warning console en prod                                 | `Date.now()`, `Math.random()`, `new Date().toLocaleString()` non déterministes côté serveur → décaler côté client (`useSyncExternalStore` ou `useEffect`) |
| `suppressHydrationWarning` UNIQUEMENT sur racines justifiées | ex. `<html>` pour theme, `<time>` pour date relative                                                                                                      |

### Custom hooks

| Règle                                              |                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Préfixe `use` strict                               | Sinon ESLint react-hooks ne valide pas                                                   |
| Single responsibility                              | Un hook = un concern                                                                     |
| Return signature stable (tuple OU object, pas mix) | Ex. tous les hooks projet `[value, setValue]` ou `{ value, set }` — choisir et s'y tenir |

## TypeScript strict

### Configuration `tsconfig.json` recommandée

```jsonc
{
	"compilerOptions": {
		"strict": true,
		"noUncheckedIndexedAccess": true, // arr[0] est T | undefined
		"noImplicitOverride": true,
		"noFallthroughCasesInSwitch": true,
		"exactOptionalPropertyTypes": true,
		"verbatimModuleSyntax": true,
	},
}
```

### Règles

| Règle                                                               | Vérification                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Pas de `any` non commenté                                           | grep `: any\b` ou `as any`                                                                                          |
| `unknown` étroit (narrowing par type guard ou `z.infer`)            | Lecture                                                                                                             |
| Discriminated unions pour states                                    | Préférer `\| { status: "loading" } \| { status: "error", error } \| { status: "ok", data }` à 3 booléens parallèles |
| `as const` sur tableaux/objets de constantes                        | Préserve la littéralité                                                                                             |
| `satisfies` plutôt que `:` quand inférence stricte voulue           | `const config = { ... } satisfies Config`                                                                           |
| `z.infer<typeof schema>` au lieu de duplication type/schema         | grep `type X = { ... }` puis `z.object({ ... })` parallèle                                                          |
| Type predicates (`x is Foo`) plutôt que casts                       | `function isFoo(x: unknown): x is Foo { ... }`                                                                      |
| Pas de `// @ts-ignore` / `// @ts-expect-error` sans raison + ticket | grep `@ts-` → vérifier comment justifié                                                                             |
| Exports nommés > default (sauf pages Next.js)                       | Pages Next requièrent `export default`                                                                              |
| Pas de barrel `index.ts` ré-exportant tout                          | Tree-shaking + circular deps                                                                                        |

### Branded types (cas critiques)

```ts
type OrderId = string & { readonly __brand: "OrderId" }
type UserId = string & { readonly __brand: "UserId" }

function getOrder(id: OrderId): Promise<Order> { ... }
getOrder("abc")          // ❌ Error: string is not OrderId
getOrder(orderId as OrderId) // ✅
```

**Trade-off** : ajout de friction (cast à la frontière). Réserver aux IDs souvent confondus (ex. `userId` vs `customerId` Stripe).

## Tailwind 4 & shadcn/ui

### Tailwind 4

| Règle                                      |                                              |
| ------------------------------------------ | -------------------------------------------- |
| Design tokens via `@theme`                 | Pas de couleur hex hardcodée si token existe |
| `cn()` utility (`clsx` + `tailwind-merge`) | Pas de class concat manuel                   |
| Variants via `cva()`                       | shadcn pattern                               |
| `motion-safe:` / `motion-reduce:`          | Respect `prefers-reduced-motion`             |
| `@container` queries                       | Adapter au container, pas au viewport        |

### shadcn/ui

| Règle                                      |                                        |
| ------------------------------------------ | -------------------------------------- |
| Composition Slot + `asChild`               | Polymorphisme propre                   |
| Pas de réécriture composant existant       | Étendre via `className` + cva variants |
| `forwardRef` retiré (React 19 ref as prop) | Mettre à jour composants legacy        |

## Accessibilité WCAG 2.1 AA

### Sémantique

| Règle                                                | Erreur fréquente                |
| ---------------------------------------------------- | ------------------------------- |
| `<button>` pour actions, `<a>` pour navigation       | `<div onClick>` — interdit      |
| Hiérarchie h1-h6 logique                             | h1 unique par page, pas de saut |
| `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` | Landmarks pour lecteurs d'écran |

### Focus

| Règle                                                   |                                                      |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `:focus-visible` toujours visible (pas `outline: none`) | Tab navigation testable au clavier                   |
| Focus trap obligatoire dans dialog                      | Radix le fait nativement                             |
| Restore focus on close (sur trigger)                    | Idem Radix                                           |
| Skip link "Aller au contenu" sur layouts longs          | `<a href="#main" class="sr-only focus:not-sr-only">` |

### ARIA

| Règle                                                                    | Exemple                       |
| ------------------------------------------------------------------------ | ----------------------------- |
| `aria-label` ou `aria-labelledby` sur tout élément interactif sans texte | Icon-only button              |
| `aria-live="polite"` (sr-only) pour feedback async                       | Toast réseau, validation form |
| `aria-expanded` / `aria-selected` / `aria-checked` sur composants custom | Accordion, tabs, switch       |
| `aria-invalid` + `aria-describedby` pour erreurs form                    | Lié à `<p id="error-x">`      |

### Couleur / contraste

| Règle                                             | Outil                                 |
| ------------------------------------------------- | ------------------------------------- |
| Contraste 4.5:1 (texte normal), 3:1 (large 18pt+) | Lighthouse / axe DevTools             |
| Pas d'info uniquement par couleur                 | Erreur form = couleur + icône + texte |

### Touch / motion

| Règle                             |                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| Touch targets ≥ 44×44px           | WCAG 2.5.5. Pattern projet : `min-h-11 sm:min-h-9` (44px mobile, 36px desktop OK car souris) |
| `prefers-reduced-motion` respecté | Animations override (View Transitions, motion/react `motion-safe:`)                          |

### Forms

| Règle                                                 |                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `<label>` associé via `htmlFor` ou wrap               | Pas de placeholder seul                                                                 |
| `autocomplete` tokens corrects                        | `shipping street-address`, `email`, `current-password`, `new-password`, `one-time-code` |
| `enterKeyHint` (`next` / `done` / `send` / `search`)  | Mobile keyboard helper                                                                  |
| `inputMode` (`tel` / `email` / `numeric` / `decimal`) | Mobile keyboard layout                                                                  |
| `aria-invalid` + erreur dans `aria-describedby`       | Pas juste une couleur rouge                                                             |

### Images

| Règle                   |                                    |
| ----------------------- | ---------------------------------- |
| `alt` descriptif        | Pas `alt="image"` ou `alt="photo"` |
| `alt=""` pour décoratif | Lecteur d'écran skip               |

## Sécurité OWASP Top 10

| Risque OWASP                  | Mitigation                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control     | `requireAuth`/`requireAdmin` première ligne action ; IDOR : `where: { id, userId: session.user.id }`       |
| A02 Cryptographic Failures    | Cookies `Secure + HttpOnly + SameSite=Lax`, secrets en env vars typées Zod, hash bcrypt/argon2             |
| A03 Injection                 | Pas de `$queryRawUnsafe` avec input user. `Prisma.sql\`...\`` template tag. DOMPurify si HTML user.        |
| A04 Insecure Design           | Threat modeling sur features sensibles (auth, paiement, admin)                                             |
| A05 Security Misconfiguration | CSP sans `unsafe-inline` (nonce si nécessaire), HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff |
| A06 Vulnerable Components     | `pnpm audit` régulier, Renovate/Dependabot                                                                 |
| A07 Auth Failures             | Rate-limit login (5/15min), MFA si applicable, session expiry, CSRF token                                  |
| A08 Software & Data Integrity | Webhook Stripe signature + 5min replay window                                                              |
| A09 Security Logging          | Sentry beforeSend filtre PII (email/password/token/PAN/IBAN/address)                                       |
| A10 SSRF                      | Pas de fetch URL user-controlled sans allowlist                                                            |

### PII filtering Sentry

```ts
// sentry.server.config.ts / sentry.client.config.ts
Sentry.init({
	beforeSend(event) {
		// Strip PII
		if (event.user) {
			delete event.user.email;
			delete event.user.ip_address;
		}
		if (event.request?.cookies) delete event.request.cookies;
		if (event.request?.headers) {
			delete event.request.headers.authorization;
			delete event.request.headers.cookie;
		}
		return event;
	},
});
```

## Performance — Core Web Vitals

| Métrique                            | Cible   | Outil                             |
| ----------------------------------- | ------- | --------------------------------- |
| **LCP** (Largest Contentful Paint)  | < 2.5s  | Lighthouse, Vercel Speed Insights |
| **INP** (Interaction to Next Paint) | < 200ms | Idem (remplace FID)               |
| **CLS** (Cumulative Layout Shift)   | < 0.1   | Idem                              |

### Bundle

| Règle                                                     |                                |
| --------------------------------------------------------- | ------------------------------ |
| `pnpm size` sous budget projet                            | size-limit dans `package.json` |
| `pnpm analyse` si suspicion régression                    | `next-bundle-analyzer`         |
| Code splitting via `next/dynamic` pour lourds client-only |                                |
| Pas de polyfill obsolète (target ES2022+)                 |                                |

### DB / I/O

| Règle                                           |                                               |
| ----------------------------------------------- | --------------------------------------------- |
| Pas de N+1 Prisma                               | `select` granulaire ou `include` justifié     |
| Pagination cursor (préférée pour > 1000 rows)   | `cursor: { id }` + `take`                     |
| Indexes DB sur colonnes filtrées/triées/jointes | `@@index([userId, status, createdAt])` Prisma |

## Tests

### Vitest (unit + intégration)

```ts
describe("buildOrderWhereClause", () => {
	it("filtre par status quand status présent", () => {
		// Arrange
		const params = { filters: { status: "PAID" } };
		// Act
		const where = buildOrderWhereClause(params);
		// Assert
		expect(where.AND).toContainEqual({ status: "PAID" });
	});
});
```

| Règle                                                                                                     |                        |
| --------------------------------------------------------------------------------------------------------- | ---------------------- |
| Naming : `describe("functionName")`, `it("retourne X quand Y")`                                           |                        |
| Pattern AAA explicite                                                                                     | Arrange / Act / Assert |
| Edge cases : null/undefined, tableau vide, valeurs limites, concurrence                                   |                        |
| Mocks DB INTERDITS sur critical path (`cart`/`orders`/`payments`/`webhooks`/`auth`/`discounts`/`refunds`) | Incident historique    |

### Playwright (E2E)

```ts
test("@smoke checkout flow", async ({ page }) => { ... })
test("@critical payment intent succeeded", async ({ page }) => { ... })
```

| Règle                                                       |                                      |
| ----------------------------------------------------------- | ------------------------------------ |
| Tags `@smoke` (flow minimal) et `@critical` (paiement/auth) |                                      |
| Sharding ×4 en CI                                           | `pnpm e2e --shard 1/4`               |
| Pas de `page.waitForTimeout`                                | Préférer `expect(...).toBeVisible()` |

## Observabilité

| Règle                                                                      |                            |
| -------------------------------------------------------------------------- | -------------------------- |
| Structured logs JSON en prod (pas `console.log`)                           |                            |
| Sentry tags par domaine (`module`, `feature`, `cronJob`, `webhookHandler`) | Pour fingerprinting groupé |
| Sentry latency spans sur opérations critiques (`Sentry.startSpan`)         |                            |
| Aucun PII / secret / token / PAN dans logs ou Sentry                       | beforeSend filter          |
