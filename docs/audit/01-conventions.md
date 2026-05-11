---
title: Conventions Synclune (audit-specific delta)
version: 2.2.0
last-reviewed: 2026-05-11
applies-to: synclune monorepo (Next.js 16.2)
---

# Conventions Synclune — delta audit-specific

Règles **internes au projet** spécifiques au framework d'audit. Cycle de vie distinct des [standards externes](./00-standards.md).

> 📘 **Source unique** : `CLAUDE.md` (racine du repo) couvre l'architecture DDD, les layers, les helpers auth, les profils cache, le naming et les conventions générales. Ce fichier ne reprend QUE les règles **propres à l'audit** : exceptions documentées, règles d'or, anti-patterns audit, memory feedbacks owner. Lire CLAUDE.md AVANT.

Toute modification ici implique un PR `docs:` + mise à jour `CHANGELOG.md`.

## Sommaire

- [Architecture en couches (DDD)](#architecture-en-couches-ddd)
- [Auth helpers & Server Actions](#auth-helpers--server-actions)
- [Profils de cache](#profils-de-cache)
- [Forms (TanStack Form)](#forms-tanstack-form)
- [State (Zustand)](#state-zustand)
- [Prisma & DB](#prisma--db)
- [Soft delete & RGPD](#soft-delete--rgpd)
- [Naming](#naming)
- [Composants partagés (`shared/`)](#composants-partagés-shared)
- [Mobile UX](#mobile-ux)
- [Conformité fiscale & légale FR](#conformité-fiscale--légale-fr)
- [Memory feedbacks (règles owner)](#memory-feedbacks-règles-owner)

## Architecture en couches (DDD)

> 📘 **Source** : `CLAUDE.md § Module Layers Pattern` (table layers + matrice de décision). Ne pas dupliquer ici — relire CLAUDE.md.

### Exceptions documentées (à respecter — ne pas refactorer)

#### Module `webhooks/`

Les handlers Stripe sont internes (pas Server Actions). `services/` peut contenir de la logique transactionnelle complète (read + mutation atomique) pour garantir l'atomicité.

#### Reads de validation dans `actions/`

Acceptés pour :

- Vérifications d'existence avant mutation (`findUnique`)
- Vérifications d'unicité (`findFirst` doublons name/code)
- Récupération données pour bulk operations (`findMany` avant update/delete groupé)

Atomiques avec la mutation, ne bénéficieraient pas du cache (données potentiellement stales).

#### Services transactionnels partagés

Mutations DB ou I/O (email) acceptées dans `services/` quand appelé depuis plusieurs contextes (cron, webhooks, server components) ET la logique doit rester atomique :

| Fichier                                                 | Raison                                                                                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `addresses/services/save-address.service.ts`            | Création atomique count + create partagée actions + payments/checkout                                                                                                                                                    |
| `reviews/services/send-review-request-email.service.ts` | cron + webhooks + actions                                                                                                                                                                                                |
| `payments/services/stripe-customer.service.ts`          | Stripe + DB atomique checkout                                                                                                                                                                                            |
| `payments/services/order-creation.service.ts`           | Stock lock + order + discount usage atomique                                                                                                                                                                             |
| `wishlist/services/notify-back-in-stock.ts`             | Notification atomique post-restock                                                                                                                                                                                       |
| `cart/services/sku-validation.service.ts`               | DB reads partagés actions + SKU selector                                                                                                                                                                                 |
| `media/services/delete-uploadthing-files.service.ts`    | UTApi cleanup partagé reviews / account-deletion / hard-delete                                                                                                                                                           |
| `media/services/generate-thumbhash.ts`                  | Sharp + HTTP download appelé depuis UploadThing core (catalogMedia + reviewMedia)                                                                                                                                        |
| `media/services/image-downloader.service.ts`            | HTTP download avec SSRF protection partagé thumbhash + validate-dimensions + strip-metadata                                                                                                                              |
| `media/services/validate-image-dimensions.service.ts`   | Sharp metadata anti-image-bomb depuis UploadThing core onUploadComplete                                                                                                                                                  |
| `media/services/strip-image-metadata.service.ts`        | Sharp EXIF/GPS strip RGPD depuis UploadThing core onUploadComplete (catalogMedia + reviewMedia)                                                                                                                          |
| `orders/services/persist-invoice-number.service.ts`     | Génération + persistance atomique numéro facture (Art. 286 CGI, advisory lock par année). Appelé depuis route API `/api/orders/[orderNumber]/invoice`.                                                                   |
| `store-settings/services/auto-reopen.service.ts`        | Cron `reopen-store` (`*/15`) check-and-set atomique singleton (`updateMany WHERE isClosed=true AND reopensAt<=now`). Fallback inline dans `getStoreStatus` couvre la fenêtre 15min entre `reopensAt` passé et tick cron. |

> Tout nouveau service transactionnel partagé doit être ajouté à cette table avec sa raison.

#### Pagination JS pour `getProducts` (catalogue < 1000 produits)

`modules/products/data/get-products.ts:fetchProducts` charge tous les produits via `prisma.product.findMany({ where, select })` puis trie/pagine en JS. Justifié tant que **le catalogue reste < 1000 produits** :

- Le tri par prix nécessite `MIN()` sur les SKUs (impossible en Prisma natif sans dénormalisation).
- Le tri fuzzy préserve l'ordre de relevance des IDs pré-calculés (pg_trgm).
- Le tri bestsellers/popular utilise des IDs pré-calculés.
- Cache `catalog` (15min/5min) absorbe le coût.

**Seuil de bascule** : à partir de ~1000 produits, dénormaliser `Product.minPriceInclTax` (trigger SQL ou invalidation côté action SKU) + migrer vers cursor Prisma natif (`cursor: { id }`, `take: perPage + 1`). Migration touche le critical path orders/cart/payments — planifier un sprint dédié.

## Auth helpers & Server Actions

> 📘 **Helpers `requireAuth` / `requireAdmin` / `requireAdminWithUser`** : voir `CLAUDE.md § Server Actions Pattern`. Ne pas dupliquer.

### Pattern Server Action (référence rapide pour audit)

```ts
"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, success, handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";

export async function createSomething(
	prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const validation = validateInput(schema, { name: formData.get("name") });
	if (!validation.success) return validation.error;

	try {
		await prisma.model.create({ data: validation.data });
		updateTag("models-list");
		return success("Créé avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur création");
	}
}
```

### Action helpers (`shared/lib/actions/`)

> 📘 Liste complète des helpers (`success`, `error`, `notFound`, `unauthorized`, `forbidden`, `validationError`, `validateInput`, `validateFormData`, `handleActionError`, `enforceRateLimit`) : voir `CLAUDE.md § Server Actions Pattern`.

### Pattern erreurs métier

```ts
import { BusinessError } from "@/shared/lib/actions";

if (sku.stock < quantity) {
	throw new BusinessError("Stock insuffisant", "INSUFFICIENT_STOCK");
}
// Catché par handleActionError, retourné en error() formaté UI
```

> ❌ **Pas de `Result<T, E>` discriminated union pour erreurs métier** — Synclune utilise throw + catch via `handleActionError`. Choix architectural intentionnel.

## Profils de cache

> 📘 **4 profils `checkout` / `user` / `catalog` / `reference`** (durées + usages) : voir `CLAUDE.md § Caching` + définition complète dans `glossary.md` (entrée "Cache profiles 🟣").

### Règle d'or (audit-specific)

```ts
// Cookies/headers incompatibles avec "use cache" → wrapper pattern
export async function getCart() {
	const userId = (await getSession())?.user?.id;
	return _fetchCart(userId);
}

async function _fetchCart(userId?: string) {
	"use cache: private";
	cacheLife("checkout");
	cacheTag(`cart-${userId}`);
	return prisma.cart.findFirst({ where: { userId } });
}
```

### Cache tags — convention

- Liste : `<entity>-list` (ex. `products-list`, `orders-list`)
- Liste filtrée : `<entity>-list-<filter>` (ex. `products-list-${collectionSlug}`)
- Détail : `<entity>-${id}` ou `<entity>-${slug}`
- Cross-module : invalider tous les tags impactés (cf. [audit transversal](./03-cross-module.md))

## Forms (TanStack Form)

```tsx
const form = useAppForm<MyInput>({
	defaultValues: { name: "" },
	validators: { onChange: schema },
	onSubmit: async ({ value }) => {
		/* ... */
	},
});
```

| Règle                                                                                     |                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------ |
| `useAppForm` hook projet (pas `useForm` direct)                                           | Wraps validation + focus first error |
| `useFocusFirstError` automatique                                                          | sur 22+ forms                        |
| `disabled` pendant submission via `form.state.isSubmitting` ou `useFormStatus`            |                                      |
| `aria-live="polite"` sr-only pour feedback success/error                                  |                                      |
| Pas d'`autoFocus` (refus owner — voir [memory feedbacks](#memory-feedbacks-règles-owner)) | Sauf search dialogs explicites       |
| `enterKeyHint` adapté (`next` / `done` / `send`)                                          | Mobile UX                            |
| `autoCapitalize` cohérent (`words` noms, `off` code/email)                                |                                      |
| Mobile : `AdminFormFooter` sticky shared component                                        |                                      |

## State (Zustand)

5 stores documentés :

1. `dialogs` — état des Radix Dialogs ouverts
2. `alert-dialogs` — état des AlertDialogs ouverts
3. `sheets` — état des Sheets ouverts
4. `cookie-consent` — RGPD consent
5. `badge-counts` — compteurs FAB / nav

| Règle                                          |                                |
| ---------------------------------------------- | ------------------------------ |
| État minimal — pas de duplication serveur      | RSC + Suspense gèrent les data |
| Sélecteurs ciblés pour éviter re-render global | `useStore(state => state.x)`   |
| Persist uniquement si nécessaire               | cookie consent, panier guest   |

## Prisma & DB

### Connection pooling Neon

```env
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"  # runtime (pooled)
DIRECT_URL="postgresql://..."                                       # migrations (direct)
```

| Règle                                         |                         |
| --------------------------------------------- | ----------------------- |
| `DIRECT_URL` pour migrations                  | sinon timeout pgbouncer |
| `DATABASE_URL` pooled pour runtime serverless |                         |

### Schéma

| Règle                                                      | Exemple                                            |
| ---------------------------------------------------------- | -------------------------------------------------- |
| `@@index` sur colonnes filtered/sorted/joined              | `@@index([userId, status, createdAt(sort: Desc)])` |
| `@@unique` composite quand combinaison unique              | `@@unique([userId, skuId])` (wishlist)             |
| `deletedAt DateTime?` pour soft delete                     |                                                    |
| `createdAt` / `updatedAt` `@default(now())` / `@updatedAt` | Timestamp universel                                |

### Helpers projet (`shared/lib/prisma`)

```ts
import { notDeleted, softDelete } from "@/shared/lib/prisma";

await prisma.order.findMany({ where: { ...notDeleted } });
await softDelete.order(orderId);
```

### Imports enums / namespace Prisma générés

Convention auditée 2026-05-11 (cf. audit `modules/reviews` P1.6) :

| Origine import                                                                            | Chemin imposé                    | Pourquoi                                                                                     |
| ----------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| Code serveur : `actions/`, `data/`, `services/`, `lib/`                                   | `@/app/generated/prisma/client`  | Donne accès à `Prisma.*` (namespace runtime) + types serveur sans alourdir le client bundle. |
| Composants & types partagés : `components/`, `hooks/`, `constants/`, `types/`, `schemas/` | `@/app/generated/prisma/browser` | RSC-safe : ré-exporte les enums sans runtime Prisma client (≈ 0 KB côté browser).            |
| **Interdit**                                                                              | `@/app/generated/prisma/enums`   | Subset legacy. Toujours préférer `/browser` qui ré-exporte `./enums`.                        |

> `pnpm audit:lint` vérifie qu'aucun fichier ne reste sur `/enums` (drift bloquant).

### Transactions

```ts
// Sequential (déclaratif)
await prisma.$transaction([
  prisma.sku.update({ where: { id }, data: { stock: { decrement: 1 } } }),
  prisma.order.create({ data }),
])

// Interactive (logique conditionnelle)
await prisma.$transaction(async (tx) => {
  const sku = await tx.sku.findUnique({ where: { id } })
  if (sku.stock < qty) throw new BusinessError("...")
  await tx.sku.update({ ... })
  await tx.order.create({ ... })
})
```

| Règle                                             |                                      |
| ------------------------------------------------- | ------------------------------------ |
| Toute mutation multi-table = transaction          | Atomicité                            |
| `prisma.$transaction` pessimiste si race critique | Stock, isDefault toggle, role change |

### Optimistic concurrency (cas critiques)

```ts
// Check-and-set Prisma optimistic
await prisma.sku.update({
	where: { id, stock: { gte: quantity } }, // gte dans where = check
	data: { stock: { decrement: quantity } },
});
// Throw NotFoundError si stock < quantity (gagne le 1er thread)
```

### Migrations

| Règle                                       |                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------- |
| Atomiques, reversibles                      | Tester rollback en local                                          |
| Pas de `DROP` destructif sans backup        | Multi-step : ajouter col → backfill → bascule → drop ancienne col |
| Naming : `YYYYMMDDHHMMSS_action_descriptif` | `pnpm prisma migrate dev --name add_review_request_sent_at`       |

## Soft delete & RGPD

| Règle                                                                                      |                                                          |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Soft delete = `deletedAt = now()` (10 ans retention factures)                              | Hard delete uniquement post-cron `hard-delete-retention` |
| `notDeleted` filter dans tous les `data/`                                                  | Sinon données effacées remontent                         |
| Account deletion : grace period 30j (cron `process-account-deletions`)                     | RGPD : permet annulation                                 |
| Export RGPD : tous modules cohérent (orders, addresses, reviews, wishlist, cart, sessions) | Format JSON + ZIP, rate-limit 1/24h                      |

## Naming

> 📘 **Conventions de base** (kebab-case fichiers, PascalCase composants, camelCase fonctions, UPPER_SNAKE_CASE constantes, UI français / code anglais, commits conventionnels, indentation tabs) : voir `CLAUDE.md § Conventions`.

### Naming spécifique audit (à vérifier sur chaque module)

| Type                       | Convention                                                        | À auditer                                        |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| Booléens                   | préfixe `is` / `has` / `can` / `should`                           | grep `function ([A-Z]                            | [a-z]+)` non préfixé renvoyant boolean |
| Hooks                      | préfixe `use`                                                     | tout fichier `shared/hooks` ou `modules/*/hooks` |
| Server Actions (mutations) | verbe : `createX`, `updateX`, `deleteX`, `bulkApproveX`           | grep export `actions/` non-verbe                 |
| Data fetchers (reads)      | `getX` (publique) + `_fetchX` (interne cachée)                    | grep `data/` exports                             |
| Services purs              | `buildX`, `computeX`, `validateX`, `formatX`                      | grep `services/` exports                         |
| Tests                      | `<nom>.test.ts(x)` à côté du code OU `__tests__/<nom>.test.ts(x)` | grep `*.spec.ts` (legacy à migrer)               |

## Composants partagés (`shared/`)

> 📘 **Structure `shared/`** : voir `CLAUDE.md § Architecture` (la même arbo y est listée).

### Hooks projet récurrents

| Hook                   | Usage                                                        |
| ---------------------- | ------------------------------------------------------------ |
| `useAppForm`           | Wrapper TanStack Form                                        |
| `useFocusFirstError`   | Focus 1er field error                                        |
| `useHaptic`            | Vibration API mobile                                         |
| `useLongPress`         | Long-press (storefront product-card seulement, retiré admin) |
| `useUnsavedChanges`    | Confirm avant quitter                                        |
| `useLightbox`          | Lightbox state                                               |
| `useSyncExternalStore` | Pour SSR-safe externes (CSS supports, viewport, etc.)        |

## Mobile UX

| Pattern                                                                               |                                              |
| ------------------------------------------------------------------------------------- | -------------------------------------------- |
| Touch target ≥ 44px : `min-h-11 sm:min-h-9`                                           | Mobile 44px / desktop 36px (souris OK)       |
| `touch-manipulation` CSS                                                              | Évite délai 300ms double-tap                 |
| `safe-area-inset-bottom` sur sticky bottom                                            | `pb-[calc(env(safe-area-inset-bottom)+...)]` |
| `AdminFormFooter` shared sticky                                                       | Évite duplication sur 22 forms               |
| `ResponsiveActionMenu` (Vaul mobile / Radix desktop)                                  | Pattern projet                               |
| `ResponsiveAlertDialog`                                                               | Idem                                         |
| Bottom-bar awareness skeletons : `pb-[calc(--bottom-bar-height...)]`                  | Évite CLS                                    |
| `overscroll-contain` listes longues                                                   | Empêche pull-to-refresh accidentel           |
| `useHaptic("light")` sur tap, `("medium")` sur long-press, `("error")` sur form error |                                              |
| View Transitions cohérentes listing↔détail                                            | `viewTransitionName: "<entity>-${id}"`       |

## Conformité fiscale & légale FR

| Sujet                           | Règle                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| TVA franchise art. 293 B        | Seuil 37 500 € (env `VAT_FRANCHISE_THRESHOLD_EUR`). Bandeau warning ≥ 80%, critical ≥ 100% (cf. dashboard). |
| URSSAF échéances trimestrielles | 30/04, 31/07, 31/10, 31/01 N+1 (rollover). Bandeau J-15.                                                    |
| Numérotation factures           | Séquentielle, immuable, sans trou (loi anti-fraude TVA). Format `FAC-YYYY-NNNNNN`. Lock atomique counter.   |
| Droit rétractation              | 14 jours (conso e-commerce). Refunds tracked dans audit log.                                                |
| RGPD                            | Soft delete 10 ans (factures), grace period 30j (account deletion), export complet, consent tracking.       |
| PSD2 / SCA                      | 3DS2 obligatoire > 30€ Stripe (handler `requires_action`).                                                  |
| Cookies                         | Banner consent before non-essential. Cookie consent store Zustand.                                          |

## Memory feedbacks (règles owner)

Règles explicites de l'owner (matérialisées depuis mémoire Claude). À ne pas remettre en question en audit.

| Règle                                                               | Raison                                                                                        | Source                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Pas d'`autoFocus` dans formulaires                                  | Gâche UX (scroll/clavier mobile)                                                              | feedback_no_autofocus_forms                 |
| OK `autoFocus` uniquement dans search dialogs ouverts explicitement | Cohérent avec UX search                                                                       | idem                                        |
| Pas de bouton `Cancel` sur create-product-form admin                | Asymétrie volontaire create (`beforeunload` seul) vs edit (`Cancel`)                          | feedback_no_cancel_button_create_form       |
| Pas d'icônes sur HeroReassuranceBanner                              | Banner reste texte (sauf Visa/MC/CB)                                                          | feedback_no_reassurance_banner_icons        |
| Pas de double bouton retour admin mobile                            | Garder flèche header iOS-native uniquement                                                    | feedback_no_double_back_button_admin_mobile |
| Patterns natifs 2026 > rustines cosmétiques                         | Repenser UI mobile (ActionSheet/Drawer) plutôt qu'ajuster padding sur composant desktop-first | feedback_native_patterns                    |
| Pas de `Speculation Rules`                                          | Refusé explicitement                                                                          | landing-page-final-audit-2026-05-09         |
| Pas de newsletter inline                                            | Refusé explicitement                                                                          | idem                                        |
| Pas de trust counter                                                | Refusé explicitement                                                                          | idem                                        |
| Pas de cross-doc View Transitions                                   | Refusé explicitement                                                                          | idem                                        |

## Règles de mise à jour

Toute modification de ce fichier requiert :

1. PR `docs: update conventions Synclune` ciblé.
2. Mise à jour `CHANGELOG.md` (`### Changed` ou `### Added`).
3. Bump version frontmatter (mineure si ajout, majeure si breaking).
4. Validation owner avant merge.
