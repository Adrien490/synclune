# Audit technique complet - Synclune

## Contexte technique

| Catégorie | Technologies |
|-----------|--------------|
| **Framework** | Next.js 16.1 (App Router) + React 19.2 |
| **UI** | shadcn/ui + Tailwind CSS 4 + Framer Motion |
| **State** | Zustand (dialogs, cookies) |
| **Forms** | TanStack Form + `useAppForm` + Zod 4 |
| **Data** | Prisma 7 (PostgreSQL Neon) + `"use cache"` / `cacheLife` / `cacheTag` |
| **Auth** | Better Auth (email, Google, GitHub) |
| **Paiements** | Stripe (webhooks, refunds) |
| **Uploads** | Uploadthing |
| **Emails** | React Email + Resend |
| **Sécurité** | Arcjet (rate limiting) + validation Zod server-side |
| **Type d'app** | E-commerce bijoux artisanaux (Storefront + Admin) |

---

## Architecture projet

```
app/
├── (auth)/              # Auth pages
├── (boutique)/          # Storefront
├── admin/               # Dashboard admin
└── api/                 # Webhooks, uploads

modules/[module]/        # DDD - 22 modules
├── actions/             # Server Actions
├── data/                # Data fetching + cache
├── components/          # React components
├── schemas/             # Zod schemas
├── constants/           # Cache tags
└── types/               # TypeScript

shared/                  # Cross-cutting
├── components/          # UI, forms
├── lib/                 # prisma, email, actions helpers
├── hooks/               # useFilter, usePagination...
└── stores/              # Zustand
```

---

## Règles de l'audit

| Règle | Description |
|-------|-------------|
| ⚠️ **Code existant uniquement** | Base-toi UNIQUEMENT sur le code fourni. Pas de faux positifs ni de problèmes hypothétiques. |
| 🎯 **Priorisation obligatoire** | `P0` = Bloquant (sécurité, bug critique) / `P1` = Important (perf, a11y, maintenabilité) / `P2` = Nice-to-have |
| 🔍 **Adaptation au contexte** | **Page** → routing, metadata, data fetching, loading/error states / **Composant** → props, réutilisabilité, isolation |

---

## Patterns obligatoires

### ❌ Anti-patterns React 19 (signaler systématiquement)

Le compilateur React 19 optimise automatiquement. **Interdits :**
- `useMemo()`
- `useCallback()`
- `React.memo()`

### ✅ Server Actions

```typescript
"use server"

import { requireAdmin, validateInput, success, error, handleActionError } from "@/shared/lib/actions"
import { prisma } from "@/shared/lib/prisma"
import { updateTag } from "next/cache"

export async function myAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  // 1. Auth
  const admin = await requireAdmin()
  if ("error" in admin) return admin.error

  // 2. Validation Zod
  const validation = validateInput(schema, {
    name: formData.get("name"),
  })
  if (!validation.success) return error(validation.error.errors[0]?.message)

  // 3. Mutation + cache invalidation
  try {
    await prisma.model.create({ data: validation.data })
    updateTag("cache-tag")
    return success("Créé avec succès")
  } catch (e) {
    return handleActionError(e, "Erreur")
  }
}
```

### ✅ Data fetching + Cache

```typescript
// Données publiques
export async function getProducts() {
  "use cache"
  cacheLife("products")
  cacheTag("products-list")
  return prisma.product.findMany({ where: { ...notDeleted } })
}

// Données privées (wrapper car cookies/headers incompatibles avec "use cache")
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

### ✅ Prisma (soft delete obligatoire)

```typescript
import { notDeleted, softDelete } from "@/shared/lib/prisma"

// Toujours exclure les soft-deleted
await prisma.order.findMany({ where: { ...notDeleted } })

// Jamais de hard delete
await softDelete.order(orderId)
```

### ✅ Forms (TanStack Form)

```typescript
const form = useAppForm({
  defaultValues: { name: "" },
  validators: { onChange: mySchema },
  onSubmit: async ({ value }) => { /* ... */ }
})
```

---

## Périmètre de l'audit

### 0. Cartographie & Exploration

| Check | Description |
|-------|-------------|
| ☐ | Arborescence fichiers (si page : `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`) |
| ☐ | Hiérarchie composants avec indication **Server** / **Client** |
| ☐ | Flux de données : Data fetching → Props → Zustand → Server Actions → Cache |
| ☐ | Dépendances entre composants |
| ☐ | Composants réutilisables vs spécifiques |

### 1. Architecture & Maintenabilité

| Check | Description |
|-------|-------------|
| ☐ | Structure DDD respectée (`modules/[module]/actions\|data\|components\|schemas\|types/`) |
| ☐ | Séparation des responsabilités (pas de logique métier dans UI) |
| ☐ | Conventions : fichiers `kebab-case`, composants `PascalCase`, fonctions `camelCase`, constantes `UPPER_SNAKE_CASE` |
| ☐ | Imports corrects (`@/modules/...`, `@/shared/...`) |
| ☐ | Fichiers < 300 lignes |

### 2. Performance

**Cibles Core Web Vitals :**

| Métrique | Cible |
|----------|-------|
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |

| Check | Description |
|-------|-------------|
| ☐ | Server Components par défaut (`"use client"` justifié uniquement) |
| ☐ | `"use cache"` + `cacheLife()` + `cacheTag()` présents |
| ☐ | `updateTag()` après chaque mutation |
| ☐ | Lazy loading composants lourds (`dynamic()`) |
| ☐ | Images : `next/image` + `placeholder="blur"` + `priority` sur LCP + `sizes` |
| ☐ | Pas de memoization manuelle (React 19) |
| ☐ | Pas d'imports lourds côté client |

### 3. Sécurité 🔒

| Check | Description |
|-------|-------------|
| ☐ | `requireAuth()` / `requireAdmin()` sur TOUTES les Server Actions protégées |
| ☐ | `validateInput(schema, data)` sur TOUS les inputs utilisateur |
| ☐ | `notDeleted` dans TOUTES les queries Prisma |
| ☐ | Pas de données sensibles exposées côté client |
| ☐ | Pas de `dangerouslySetInnerHTML` sans sanitization |
| ☐ | Pas de `as` TypeScript sur données utilisateur |
| ☐ | Webhooks Stripe : signature vérifiée + idempotency |

### 4. RGPD & Conformité

| Check | Description |
|-------|-------------|
| ☐ | Soft deletes systématiques (jamais de hard delete) |
| ☐ | Cookie consent fonctionnel |
| ☐ | Rétention légale (10 ans commandes) |

### 5. SEO (Storefront)

| Check | Description |
|-------|-------------|
| ☐ | `generateMetadata()` avec `title`, `description`, `openGraph`, `twitter` |
| ☐ | Structured data JSON-LD (produits) |
| ☐ | Images avec `alt` descriptifs |
| ☐ | Heading hierarchy (`h1` unique → `h2` → `h3`) |

### 6. UI/UX

| Check | Description |
|-------|-------------|
| ☐ | États complets : ⏳ Loading (Skeleton) / ❌ Error (message + retry) / 📭 Empty (message + CTA) / ✅ Success (toast) |
| ☐ | Feedback Sonner après chaque action |
| ☐ | Responsive mobile-first (< 640px / 640-1024px / > 1024px) |
| ☐ | Animations Framer Motion < 300ms, pas de layout thrashing |
| ☐ | Touch targets ≥ 44px mobile |
| ☐ | Cohérence shadcn/ui |

### 7. Accessibilité (WCAG 2.1 AA)

| Check | Description |
|-------|-------------|
| ☐ | Sémantique HTML (`<main>`, `<nav>`, `<header>`, `<footer>`, `<article>`, `<section>`) |
| ☐ | `<button>` pour actions, `<a>` pour navigation |
| ☐ | Navigation clavier (Tab, Enter, Escape, Arrows) |
| ☐ | Focus visible sur TOUS les interactifs |
| ☐ | Labels sur TOUS les inputs (`htmlFor` ou `aria-label`) |
| ☐ | `alt` sur TOUTES les images (vide si décoratif) |
| ☐ | Contraste ≥ 4.5:1 (texte) / ≥ 3:1 (UI) |
| ☐ | ARIA uniquement si nécessaire |

### 8. Robustesse

| Check | Description |
|-------|-------------|
| ☐ | `error.tsx` présent (Error Boundary) |
| ☐ | `loading.tsx` ou Suspense boundaries |
| ☐ | `not-found.tsx` si applicable |
| ☐ | TypeScript strict : pas de `any`, `as` justifié |
| ☐ | Edge cases gérés (panier vide, stock épuisé, session expirée, erreur réseau) |
| ☐ | Try/catch sur opérations async critiques |

### 9. Forms

| Check | Description |
|-------|-------------|
| ☐ | `useAppForm` utilisé |
| ☐ | Validators Zod (`onChange` ou `onBlur`) |
| ☐ | Erreurs inline par champ |
| ☐ | Bouton disabled + spinner pendant soumission |
| ☐ | Reset après succès si pertinent |

---

## Livrables attendus

### Format obligatoire :

---

## 🗺️ Cartographie

### Structure fichiers
```
[Chemin de la page ou du composant]
├── page.tsx              # [Server/Client] - Description
├── loading.tsx           # Skeleton
├── error.tsx             # Error Boundary
└── not-found.tsx         # 404
```

### Arborescence composants
```
ComposantPrincipal (Server/Client)
├── SousComposant1 (Client) ← Justification du "use client"
│   ├── SousSousComposant1a
│   └── SousSousComposant1b
├── SousComposant2 (Server)
│   └── SousSousComposant2a (Client) ← Justification
└── SousComposant3 (Server)
```

### Flux de données

| Type | Éléments |
|------|----------|
| **Data fetching** | `getFoo()`, `getBar()` |
| **Cache profiles** | `cacheLife("xxx")` |
| **Cache tags** | `cacheTag("xxx")` |
| **Server Actions** | `createFoo()`, `updateBar()` |
| **Zustand stores** | `useFooStore`, `useBarStore` |
| **Props drilling** | `prop` → `Composant1` → `Composant2` |
| **Forms** | `fooSchema` via `useAppForm` |

---

## ✅ Conformités

| Catégorie | Status | Détail |
|-----------|--------|--------|
| Structure DDD | ✅ / ⚠️ / ❌ | Détail |
| Server Components | ✅ / ⚠️ / ❌ | Détail |
| Validation Zod | ✅ / ⚠️ / ❌ | Détail |
| Cache strategy | ✅ / ⚠️ / ❌ | Détail |
| Soft delete | ✅ / ⚠️ / ❌ | Détail |
| Sécurité | ✅ / ⚠️ / ❌ | Détail |
| SEO | ✅ / ⚠️ / ❌ | Détail |
| Accessibilité | ✅ / ⚠️ / ❌ | Détail |
| Error handling | ✅ / ⚠️ / ❌ | Détail |
| TypeScript | ✅ / ⚠️ / ❌ | Détail |

---

## ⚠️ Findings

| # | P | Catégorie | Fichier:ligne | Problème | Impact | Fix court |
|---|---|-----------|---------------|----------|--------|-----------|
| 1 | P0 | Sécurité | `actions/xxx.ts:12` | Description | Impact | Fix résumé |
| 2 | P0 | Sécurité | `actions/xxx.ts:15` | Description | Impact | Fix résumé |
| 3 | P1 | Performance | `components/xxx.tsx:45` | Description | Impact | Fix résumé |
| 4 | P1 | Cache | `data/xxx.ts:8` | Description | Impact | Fix résumé |
| 5 | P1 | A11y | `components/xxx.tsx:32` | Description | Impact | Fix résumé |
| 6 | P2 | UX | `components/xxx.tsx:28` | Description | Impact | Fix résumé |
| 7 | P2 | React 19 | `components/xxx.tsx:8` | Description | Impact | Fix résumé |

---

## 🛠️ Corrections détaillées

### Finding #1 - [Titre] (P0)

**Fichier :** `chemin/vers/fichier.ts`

**Problème :** Description détaillée du problème.

**Avant :**
```typescript
// Code problématique
```

**Après :**
```typescript
// Code corrigé complet et fonctionnel
```

---

### Finding #2 - [Titre] (P0)

**Fichier :** `chemin/vers/fichier.ts`

**Problème :** Description détaillée.

**Avant :**
```typescript
// Code problématique
```

**Après :**
```typescript
// Code corrigé
```

---

*(Répéter pour tous les P0 et P1)*

---

## 🚀 Améliorations P2 (suggestions futures)

### 1. Optimistic UI

```typescript
// Exemple d'implémentation avec useOptimistic
const [optimisticState, addOptimistic] = useOptimistic(
  initialState,
  (state, newValue) => ({ ...state, ...newValue, pending: true })
)
```

### 2. Animations enrichies

```typescript
// Micro-interactions recommandées
<motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
  {/* ... */}
</motion.div>
```

### 3. Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Cmd+K` | Command palette |
| `Escape` | Fermer modales |
| `Cmd+S` | Sauvegarder (admin) |

### 4. Gestes tactiles

- Swipe pour supprimer
- Pull-to-refresh
- Pinch-to-zoom (galerie)

### 5. Autres suggestions

- [ ] Suggestion 1
- [ ] Suggestion 2
- [ ] Suggestion 3

---

## 📋 Checklist de validation

Avant de livrer cet audit, vérifier :

- [ ] Tous les fichiers fournis ont été analysés
- [ ] Chaque finding a : numéro, priorité, fichier:ligne, problème, impact, fix
- [ ] Corrections P0/P1 avec code complet et fonctionnel
- [ ] Cartographie reflète exactement la structure réelle
- [ ] Conformités basées sur le code, pas des suppositions
- [ ] Améliorations P2 réalistes et contextualisées

---

## Cible de l'audit




