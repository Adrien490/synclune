# CLAUDE.md

## Project Overview

Synclune - E-commerce bijoux artisanaux (Next.js 16, React 19, TypeScript, Prisma 7, Stripe).

- **Storefront** (`/`, groupe de routes `(shop)`) - Produits, panier, paiement
- **Admin** (`/admin`) - Catalogue, commandes, analytics
- **Stripe** - Paiements, webhooks, remboursements
- **Emails** - React Email + Resend (8 templates)
- **Auth** - Connexion **réservée à l'administration** : pas de compte client, inscription fermée (retrait de l'espace client 2026-07-31)

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
├── (auth)/                  # Connexion (admin), mot-de-passe, verification email
├── (shop)/                  # Storefront (accueil, produits, collections, creations, favoris, aide)
├── (legal)/                 # Pages legales (CGV, mentions, confidentialite)
├── admin/                   # Dashboard admin (catalogue, commandes, marketing, contenu)
├── api/                     # Routes API (auth, cron, webhooks, search, uploadthing)
├── paiement/                # Pages paiement (confirmation, annulation, retour)
├── suivi-commande/          # Suivi de commande invite (token HMAC) — SEUL acces client a une commande
└── sitemap-images.xml/      # Generation sitemap images

modules/                     # DDD - 22 modules
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
├── stores/                  # Zustand stores (6 stores)
├── styles/                  # Global styles, fonts
├── types/                   # Shared types (server actions, sessions, pagination, errors)
└── utils/                   # Formatting, slug, date, currency, password strength, seeded random
```

## Key Technologies

- **Auth**: Better Auth (email/password)
- **Database**: PostgreSQL (Neon) + Prisma 7
- **Forms**: TanStack Form + `useAppForm` hook
- **State**: Zustand (6 stores: dialog, alert-dialog, sheet, cookie-consent, badge-counts, overlay-stack)
- **UI**: shadcn/ui + Tailwind + Motion (v12, `motion/react`)
- **Uploads**: UploadThing
- **Monitoring**: Sentry (error tracking, tunnel via `/monitoring`)

### Breakpoints — rem partout, jamais px

SSOT : `shared/constants/breakpoints.ts` (`BREAKPOINTS` + `mediaBelow()` / `mediaAtLeast()` / `mediaBetween()`). Échelle alignée sur les défauts Tailwind v4, **en rem** : `xs 23.4375` · `sm 40` · `md 48` · `lg 64` · `xl 80` · `2xl 96`.

**Règle : aucune largeur en px dans un `matchMedia()`, ni dans une media query CSS écrite à la main, ni dans un `--breakpoint-*`.** Verrouillé repo-wide par `shared/constants/__tests__/no-px-media-query.regression.test.ts`.

Pourquoi : Tailwind exprime ses breakpoints en rem. Un seuil JS en px coïncide avec eux uniquement tant que la police racine vaut 16px — dès que l'utilisateur change ce réglage (accessibilité, WCAG 1.4.4), les deux divergent. Les composants **hybrides** (branche choisie en JS, branche rendue avec une classe `md:`) tombent alors dans le vide : à police racine 14px, `md:` = 672px, et la plage 672-767px laissait `/admin` **sans aucune surface de navigation** — `useIsMobile()` disait « mobile » (sidebar → `null` via `disableMobileSheet`) pendant que le CSS disait déjà « desktop ». Audit responsive 2026-07-26, P1-1.

Les media queries **sans largeur** (`prefers-reduced-motion`, `hover`, `pointer`, `orientation`, `forced-colors`) s'écrivent en clair — seules les largeurs se désynchronisent. La syntaxe range MQ4 (`(width < 48rem)`) est préférée à `(max-width: …)` : c'est l'équivalent exact de ce que Tailwind compile pour `max-md:`, sans la fenêtre de désaccord d'~1px sur les DPR fractionnaires.

**Seuils de navigation** (décision explicite, pas un accident) :

| Surface                    | Seuil | Relais au-dessus                |
| -------------------------- | ----- | ------------------------------- |
| Bottom-nav boutique        | `lg`  | `DesktopNav` (`hidden lg:flex`) |
| Bottom bar + sidebar admin | `md`  | Sidebar (`hidden md:block`)     |

La bottom-nav boutique suit `lg` pour couvrir l'iPad portrait (768×1024) : avec un seuil `md` la plage 48-64rem perdait le panier et les favoris sans gagner le mega-menu. `BottomBar` prend un prop `breakpoint: "md" | "lg"` d'où il dérive **à la fois** la classe Tailwind et la `matchMedia` — et ne publie `--bottom-bar-height` que lorsque la barre est réellement visible. Corollaire : les consommateurs de cette variable ne doivent **pas** préfixer leur offset d'un breakpoint (la variable vaut déjà 0 quand il n'y a pas de barre).

### Largeurs de contenu et grilles

| Surface    | Plafond                   | Note                                                                                                             |
| ---------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Storefront | `max-w-6xl` (1152px)      | Appliqué page par page, pas par le layout. Aucun palier `2xl:` — le hero faisait exception et décrochait de 64px |
| Checkout   | `max-w-5xl` (1024px)      | États intermédiaires en `max-w-3xl`                                                                              |
| Admin      | `max-w-[100rem]` (1600px) | **Sans `mx-auto`** : centrer ferait varier la gouttière gauche avec la largeur de fenêtre                        |

**Un palier de colonnes ne s'ajoute que si le conteneur grandit avec lui.** Les variants de grille se déclenchent sur la largeur du **viewport**, pas du conteneur : au-delà du plafond, une colonne de plus répartit le _même_ espace en plus de parts. `2xl:grid-cols-5` sur la grille produit faisait tomber les cartes de 248px à 192px (-22%) — retiré. Au-dessus du plafond, l'espace est de la marge, pas des colonnes.

### Survol vs focus

Toute affordance **porteuse d'information** révélée au survol doit l'être au focus clavier (WCAG 2.4.7) : soulignement de lien, chevron de navigation, bouton d'action qui s'éclaircit. Les effets purement décoratifs (scale d'image, halo) n'ont pas cette obligation.

⚠️ **Ne jamais placer une règle de focus derrière `can-hover:`** — ce variant vaut `(hover: hover) and (pointer: fine)` et existe pour neutraliser le sticky-hover iOS ; une règle de focus derrière lui ne s'appliquerait jamais au clavier sur tactile. Le gate va sur le hover seul :

```tsx
"can-hover:group-hover:opacity-100 group-focus-visible:opacity-100";
```

Composants verrouillés par `shared/components/__tests__/hover-focus-parity.regression.test.ts` (liste à étendre, volontairement pas un scan repo-wide : un garde-fou qui hurle sur chaque `group-hover:scale-105` décoratif serait désactivé en une semaine).

### Overlays — quelle primitive choisir

| Besoin                                           | Primitive                                                                           | Rendu                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Confirmer, action destructive                    | `ResponsiveAlertDialog`                                                             | Radix `AlertDialog`, **identique mobile et desktop** |
| Formulaire, édition                              | `ResponsiveDialog`                                                                  | Vaul `Drawer` < `md`, Radix `Dialog` ≥ `md`          |
| Navigation, filtres, panier — panneau persistant | `Sheet`                                                                             | Vaul, latéral par défaut                             |
| Menu d'actions, picker, tri — feuille éphémère   | `Drawer`                                                                            | Vaul, bottom par défaut                              |
| `Dialog` / `AlertDialog` Radix bruts             | seulement si la surface n'existe pas en mobile (raccourcis clavier, export desktop) |                                                      |

⚠️ **`ResponsiveAlertDialog` ne bascule pas** malgré son préfixe : il rend du Radix sur tous les viewports (`tone` ne pilote que la couleur du bouton d'action et le pattern haptic). Seul `ResponsiveDialog` bascule, sur `useIsMobile()` = `mediaBelow("md")`.

`Sheet` et `Drawer` enveloppent le **même** `vaul.Drawer` avec les mêmes défauts (`scrollLockTimeout=800`, `closeThreshold=0.15`). Le critère est l'intention, pas la technique : un panneau qu'on consulte (Sheet) vs une feuille qu'on referme aussitôt l'action faite (Drawer).

**Les 4 familles passent par `@radix-ui/react-dialog`** (Vaul rend un `DialogPrimitive.Content`), donc un seul verrou de scroll `react-remove-scroll` avec compensation de gouttière — pas de double verrou concurrent, y compris sur un `AlertDialog` empilé dans un `Sheet`. `noBodyStyles` sur `Sheet` ne désactive que la couche iOS `position: fixed` supplémentaire de Vaul.

**Imbrication** : un overlay ouvert depuis un `Sheet`/`Drawer` doit être rendu **dans** son arbre JSX — `vaul-nested-context` bascule alors sur `NestedRoot` (empilement natif, focus-trap chaîné). Ne jamais fermer le parent avant d'ouvrir l'enfant. Deux surfaces dérogent encore (`admin-menu-sheet`, `menu-sheet` diffèrent l'ouverture après la transition Vaul) — dette connue, pas un modèle à suivre.

⚠️ **Jamais `<SheetClose asChild>` / `<DrawerClose asChild>` autour d'un `<Link>`.** Le Slot Radix fait atterrir le `onClick` du Close sur le `<Link>`, et Next l'invoque **avant** `linkClicked` : `onOpenChange(false)` → `handleClose()` → `history.back()` synchrone, qui race le `router.push` et annule la navigation (l'utilisateur reste sur la page, sans erreur). La garde `isTopOfHistory` ne couvre PAS ce cas — elle détecte « un push a eu lieu **pendant** l'ouverture », pas « le push est queué dans le même clic, après la fermeture », où `history.length` est encore intact.

Fermer par la **prop contrôlée** à la place (`open={isOpen}` + un handler qui `close()`), ce qui court-circuite `onOpenChange`. Et naviguer en **`replace`** : l'entrée poussée à l'ouverture porte la même URL que la page, la consommer évite une pression de retour morte par cycle ouvrir → naviguer (cumulative). Deux régressions verrouillent le pattern : `responsive-action-menu/__tests__/link-history-back.regression.test.tsx` (2026-05-15) et `app/(shop)/(home)/_components/navbar/__tests__/menu-sheet-link-navigation.regression.test.tsx` (2026-07-26, monte le **vrai** `ui/sheet` — un mock du wrapper rend le test aveugle à cette chaîne). Cas non couverts restants : `dashboard-period-sheet`, `dashboard-refresh-sheet`, `filter-sheet-wrapper`.

**Historique** : `useBackButtonClose` pousse une entrée à l'ouverture pour que le retour matériel ferme l'overlay. Les 4 wrappers reprennent cette entrée sur **toutes** les fermetures via `handleClose` — un wrapper qui l'oublierait laisserait une entrée orpheline de même URL, avalant une pression de retour par cycle. `handleClose` ne recule que si l'entrée est encore au sommet (`history.length` inchangée depuis le push) : sinon une navigation a eu lieu entre-temps et reculer la défairait.

**`handleOnly`** : autorisé uniquement sur une collision de gestes constatée et décrite en commentaire sur le call site, jamais par défaut — il supprime le swipe-to-dismiss depuis le contenu. Verrouillé par `shared/components/ui/__tests__/handle-only-allowlist.regression.test.ts`.

Autres partis pris : pas de `Drawer` pour une confirmation, pas de View Transition sur une fermeture Vaul.

### React 19 - NO MEMOIZATION

Le compilateur React 19 optimise automatiquement. **NE PAS utiliser:**

- `useMemo()`, `useCallback()`, `React.memo()`

## Catalogue — invariants

### Tous les `select` Prisma du catalogue vivent dans `constants/`

`GET_PRODUCT_SELECT`, `GET_PRODUCTS_SELECT`, `GET_PRODUCT_FOR_DUPLICATION_SELECT`, `PRODUCT_CAROUSEL_SELECT`, `QUICK_SEARCH_SELECT` dans `modules/products/constants/product.constants.ts` ; les 3 selects collection dans `modules/collections/constants/collection.constants.ts` ; les 2 selects type dans `modules/product-types/constants/product-type.constants.ts`. **Ne pas écrire un `select` en ligne dans une fonction `data/`** : c'est précisément ce qui a permis à celui de la duplication de rater la migration M2M de mai 2026 (les 4 selects rangés ici avaient été mis à jour, le sien — invisible — non), et « Dupliquer un produit » a répondu « Le produit source n'existe pas » pendant ~2,5 mois.

Deux garde-fous, tous deux **sans base de données** :

- `catalogue-selects-schema-validity.regression.test.ts` — soumet les 10 selects au validateur Prisma via un client sur port fermé. Prisma valide côté client **avant** de connecter : une clé inconnue lève `PrismaClientValidationError`, une clé valide échoue sur la connexion. C'est le seul filet qui couvre le trou entre `tsc` (qui accepte silencieusement une clé inexistante dans un `select` — vérifié : un `@ts-expect-error` y est signalé _inutile_) et les tests d'intégration (skippés sans `INTEGRATION_DATABASE_URL`, donc toujours en local).
- `catalogue-selects-media-filter.regression.test.ts` — voir ci-dessous.

### `mediaType` : une vidéo ne doit jamais atteindre un champ qui exige une image

`SkuMedia` est polymorphe. Deux familles de selects, et le test ci-dessus les distingue :

| Famille             | Filtre                                                | Pourquoi                                         |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| **vignette unique** | `where: { mediaType: "IMAGE" }` **dans le select**    | L'appelant prend `images[0]` sans pouvoir trier  |
| **galerie**         | pas de filtre, mais `mediaType: true` **sélectionné** | La galerie a besoin des vidéos ; l'appelant trie |

Côté appelant, la SSOT est **`pickPrimaryImage()`** (`modules/products/services/product-display.service.ts`) : primaire IMAGE → première IMAGE → `null`. Ne jamais réécrire `find((i) => i.isPrimary) ?? images[0]` — cette expression mettait un `.mp4` dans `og:image`, dans le champ `image` d'un nœud `Product` JSON-LD (invalide en schema.org) et dans `<Image src>` (vignette cassée **+ transformation `/_next/image` facturée**). Quand elle retourne `null`, l'appelant **omet** le champ.

⚠️ `where: { isPrimary: true }` seul est banni : sur un SKU sans média primaire il rend 0 image alors que le SKU en a. Utiliser `orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { id: "asc" }] + take: 1`.

### Une seule `BreadcrumbList` et une seule `ItemList` par URL

`PageHeader` émet un `BreadcrumbList` dès qu'on lui passe des `breadcrumbs`. Les surfaces qui injectent **déjà** leur propre JSON-LD (PDP, /produits, /produits/[type], /collections/[slug]) doivent donc passer **`noStructuredData`** — sinon deux `BreadcrumbList`. L'`ItemList` appartient au **générateur de page** (`buildCatalogJsonLd`, `generateCollectionStructuredData`), imbriquée dans son `CollectionPage` via `mainEntity` : `ProductList` n'en émet plus. Deux `ItemList` aux `numberOfItems` divergents sur une même URL laissent Google en choisir une arbitrairement. Verrouillé par `shared/components/__tests__/catalogue-single-breadcrumb.regression.test.ts`.

### Visibilité : les data fns forcent, elles ne font pas confiance à l'appelant

`getProducts`, `getCollections` et `getProductTypes` forcent respectivement `status: PUBLIC`, `status: PUBLIC` et `isActive: true` pour tout appelant non-admin. La discipline de l'appelant n'est **pas** un mécanisme de sécurité : les filtres étaient corrects chez les 10 appelants publics, mais rien ne l'imposait.

⚠️ Les trois acceptent un `options.isAdmin` — **obligatoire** pour un appelant qui exécute déjà dans un scope `"use cache"` (ex. `getNavbarMenuData`) : `isAdmin()` lit `headers()`, source dynamique interdite là. Un appel public depuis un scope cache passe `{ isAdmin: false }`.

### Statuts, soft delete

- Machine à états `ProductStatus` : `product-status-validation.service.ts` (identité X→X refusée ; les 6 autres transitions autorisées). Vers `PUBLIC`, `validateProductForPublication` exige titre + ≥1 SKU actif avec stock **et un média de type IMAGE** (une vidéo `isPrimary` ne publie pas).
- **Toute lecture-avant-mutation d'un produit filtre `deletedAt: null`.** Sans ça on fabrique l'état `status: PUBLIC` + `deletedAt` — invisible en vitrine (`notDeleted` partout) mais qui casse les gardes d'**écriture** qui ne filtrent que le statut : `delete-product-type` refuserait à jamais un type « ayant des produits PUBLIC » invisibles.
- Il n'y a **pas** de `restore-product` : `deleteProduct` purge les `ProductCollection`, les paniers et les favoris. Archiver (`ARCHIVED`) est le chemin réversible ; supprimer ne l'est pas.
- `Product.slug` est unique sur **toutes** les lignes, soft-deleted incluses (aucun index partiel). Pas de P2002 pour autant : `generateSlug` suffixe (`bague-x-2`). Recréer un produit supprimé ne récupère donc jamais son slug — voulu, réutiliser le slug ferait pointer une URL indexée vers un autre bijou.

### Pas de `metaTitle` / `metaDescription` en base

Choix assumé (micro-entreprise, un champ de moins par bijou) : le titre SEO est dérivé de `title` + prix (`buildSeoTitle`, ≤ 60 c.) et la meta description est la description produit tronquée à 155 c. Corollaire : la copie vitrine et la meta description sont le même texte. Y toucher = migration Prisma + 2 champs de formulaire, chantier à part.

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

## Auth — une seule session possible, celle de l'administratrice

**Il n'y a plus de compte client** (retrait de l'espace client 2026-07-31). Trois choses le garantissent, et il faut les trois — couper l'UI seule laisserait les endpoints ouverts :

1. `emailAndPassword.disableSignUp: true` ferme `/sign-up/email` au niveau de l'API ;
2. plus aucun `socialProviders` — Google était un chemin d'**inscription** à part entière (un compte est créé au premier login OAuth), donc incompatible avec « inscription désactivée » ;
3. les routes `/inscription`, `/commandes` et `/parametres` sont supprimées, donc absentes des listes de `proxy.ts` → elles tombent dans son **default-deny**.

⚠️ **Créer un nouvel administrateur passe par `prisma/seed.ts` ou par la base — pas par l'application.** C'est assumé (opératrice unique). Corollaire : la vérification d'email est **conservée** (`requireEmailVerification: true` + `/verifier-email` + `/renvoyer-verification`), sinon un admin fraîchement créé n'aurait aucun moyen de débloquer son propre accès.

Tout le parcours d'achat est **invité** : panier et favoris par cookie de session (`Cart_owner_required` / `Wishlist_owner_required` acceptent `userId` NULL), checkout sans session (`confirmCheckout`), et consultation de commande par le lien tokenisé de l'email de confirmation (`/suivi-commande`, HMAC via `buildOrderTrackingUrl` — **SSOT à une seule branche**, cf. `order-tracking-url.regression.test.ts`). Il n'y a plus de fusion post-login : une donnée invitée **reste** invitée.

Ce qui n'a **pas** disparu et pourquoi : `Order.userId`, `Cart.userId`, `Wishlist.userId` (l'administratrice reste un `User` qui peut acheter ; `Order.userId` porte en outre le rattachement historique lu par `isInvoiceOwnerErased()` — `DiscountUsage.userId`, lui, a été droppé au Lot 0 2026-08-03 : `maxUsagePerUser` se vérifie par email de commande), `AccountStatus` (surface de révocation du compte admin, re-vérifiée en base par les helpers ci-dessous), et `Session`/`Account`/`Verification` (Better Auth y range le hash du mot de passe et les tokens de reset).

**Auth helpers** (`modules/auth/lib/require-auth`):

- `requireAuth()` - Verifies user authenticated + exists in DB (filtre `suspendedAt:null` + `accountStatus=ACTIVE`). ⚠️ En pratique, « authentifié » ne peut plus vouloir dire qu'« admin » — ce helper reste distinct de `requireAdmin*()` parce qu'il ne vérifie PAS le rôle.
- `requireAdmin()` - Verifies ADMIN role **avec re-vérification DB** (bloque admin rétrogradé/supprimé/suspendu) ; ne renvoie pas l'objet user
- `requireAdminWithUser()` - Idem `requireAdmin()` (re-check DB) + renvoie l'objet user
- `requireAdminApiRoute()` - Variante route handler (renvoie une `Response` HTTP) ; re-check DB du rôle
- `requireActiveAccountIfAuthenticated()` - Autorise les invités (pas de session) mais rejette une session dont le compte n'est pas `ACTIVE` (suspendu/INACTIVE). Pour les flux commerce optionnellement authentifiés (checkout, discount) — **le cas nominal est désormais « pas de session »**, la branche session ne couvrant plus que l'administratrice qui achèterait sur sa propre boutique
- `isVerifiedAdmin(session)` - Variante **booléenne** (ne bloque pas) avec re-check DB, pour les branches de privilège optionnelles (ex: bypass admin de la garde « boutique fermée »). Prend la session en argument ; court-circuite sans query si le cookie ne prétend pas admin
- `isAdmin()` (`modules/auth/utils/guards`) - Wrapper sans argument de `isVerifiedAdmin()` (résout la session + `cache()` de déduplication par requête). Garde des lectures admin de la couche `data/`, où un retour `ActionState` n'a pas de sens

> ⚠️ Ne JAMAIS faire confiance à `session.user.role` pour un chemin de privilège. Toujours passer par un helper `requireAdmin*` / `isVerifiedAdmin()` / `isAdmin()` qui re-vérifie en DB. Verrouillé par le garde-fou statique `modules/auth/utils/__tests__/no-raw-session-role-trust.regression.test.ts` (allowlist explicite pour le pré-filtre de `require-auth` et l'affichage cosmétique), doublé d'une assertion qui interdit à tout autre fichier de ré-implémenter le re-check en base.

**Pourquoi la fenêtre existe** : tant que le cookie-cache Better Auth est valide, `auth.api.getSession()` répond depuis le cookie signé **sans aucune lecture en base** — le plugin `customSession`, celui qui dégrade le rôle à `USER` pour un compte révoqué, ne s'exécute même pas. La latence de révocation de toute l'application vaut donc exactement `AUTH_SESSION_CONFIG.cookieCache.maxAge` (**60 s**, `modules/auth/lib/auth-env.ts`). Corollaire à retenir : **supprimer les lignes `Session` ne coupe rien avant cette expiration**, et relever ce réglage rallonge d'autant la fenêtre.

**Le re-check doit porter sur le STATUT DE COMPTE, pas seulement sur le rôle.** `fetchUserForAuth()` filtre `deletedAt` + `suspendedAt` + `accountStatus = ACTIVE` — c'est la seule implémentation, mémoïsée par `cache()` (portée requête). `resolve-invoice-admin.ts` en avait une copie qui ne lisait que `role` : un admin _suspendu_ gardait le bypass d'ownership sur les PDF facture/avoir. Supprimé le 2026-07-31 ; les 3 routes appellent `isVerifiedAdmin()` directement.

**Chaque `app/admin/**/page.tsx` appelle `assertAdminPage()`**, en plus du `requireAdminWithUser()` du layout. Un layout partagé n'est **pas** ré-exécuté lors d'une navigation client entre routes qui le partagent, et le pré-filtre de `proxy.ts` est fail-open dès que le cookie-cache a expiré — son commentaire promettait déjà que « les pages admin utilisent `requireAdmin()` » alors qu'aucune des 50 ne le faisait. Verrouillé par `app/admin/__tests__/admin-page-auth-guard.regression.test.ts`, volontairement **sans allowlist** : classer fetcher par fetcher ce qui est donnée publique (`getMaterialOptions` alimente aussi les filtres de `/produits`) ou donnée admin est un arbitrage qui se re-perd.

**Révoquer une session** : `/admin/configuration/securite` (action `revokeAllSessions`), ou la procédure SQL de secours du [`RUNBOOK`](docs/RUNBOOK.md#-compte-admin-compromis--révoquer-les-sessions). Il n'existait plus aucun chemin applicatif de révocation depuis le retrait de `modules/users`.

**Action helpers** (`shared/lib/actions/`):

- `success()`, `error()`, `notFound()`, `unauthorized()`, `forbidden()`, `validationError()` - Responses
- `validateInput()` - Zod validation (`validateFormData()` retiré, 0 appelant — audit Zod 2026-07-31)
- `handleActionError()`, `BusinessError` - Error handling
- `enforceRateLimit()` - Rate limiting

**Validation patterns** — deux patterns coexistent légitimement :

- **`validateInput(schema, data)`** : pattern par défaut pour les Server Actions qui retournent `ActionState` avec un message d'erreur simple. Le wrapper retourne `{ data } | { error: ActionState }` — usage en `if ("error" in validation) return validation.error`.
- **`schema.safeParse(data)` direct** : à conserver uniquement quand l'action :
  1. Retourne un type custom (pas `ActionState`) — ex: `quick-search.ts` retourne `QuickSearchResult`, `validate-discount-code.ts` retourne `ValidateDiscountCodeReturn`.
  2. A besoin du `path` Zod pour enrichir le message d'erreur — ex: `skus/{create,update}` retournent `validationError("${path}: ${message}")` pour cibler le champ fautif côté UI.
     Toute nouvelle action `ActionState` simple doit utiliser `validateInput()`. Ajouter un cas safeParse direct requiert une raison documentée (path-aware ou retour custom). _(Le 3ᵉ cas historique — retry path-aware de `validate-discount-code` sans `userId` — a disparu au Lot 0 2026-08-03 avec `DiscountUsage.userId`.)_

### Une Server Action VALIDE son argument, elle ne se contente pas de l'annoter

Un fichier `"use server"` transforme **chacun de ses exports** en endpoint RPC appelable directement, avec des arguments arbitraires : le type TypeScript du paramètre est effacé à l'exécution. `key: FabKey`, `paymentIntentId: string` ou `productId: string` ne garantissent rien.

Corollaire régulièrement raté : **un helper appelé par une Server Action ne doit jamais vivre dans un module `"use server"`**. Le wrapper a beau valider, le wrappé reste exposé séparément — c'est ainsi que `toggleFabVisibility` a pu écrire un cookie dont le nom dérivait d'un argument non validé, sans Zod, sans auth, sans rate limit. Soit le helper est inline, soit son fichier n'a pas la directive.

Deuxième corollaire : **parser AVANT de dériver quoi que ce soit de l'argument**. `confirmCheckout` construisait sa clé de rate limit (`checkout-confirm:guest:<email>:<ip>`) à partir de `data.email` une dizaine de lignes avant son `safeParse` — un invité qui variait son email obtenait un compteur neuf à chaque requête. Les trois actions de paiement déclarent désormais `unknown` et parsent en tête.

Verrouillé par `test/contract/server-action-input-validation.contract.test.ts` (scan repo, allowlist motivée) et `checkout-validate-before-rate-limit.regression.test.ts`.

### Longueurs Zod ↔ colonnes Prisma

Toute string Zod persistée dans une colonne `@db.VarChar(n)` doit porter un `.max()` ≤ `n`, et être déclarée dans `test/contract/zod-prisma-length-parity.contract.test.ts`.

Ni `tsc` ni les tests d'intégration ne voient ce trou : le type d'une colonne `VarChar(n)` est `string`, et `db push` accepte n'importe quelle longueur tant qu'aucune ligne trop longue n'est écrite. En production, c'est un `22001` Postgres **dans la transaction**, rendu à l'utilisateur en « Une erreur est survenue » sans indication du champ. L'audit du 2026-07-31 en a trouvé six d'un coup (`trackingNumber` 100 vs 50, `fullName` 101 vs `customerName` 100, `emailSchema` et `phoneSchema` sans borne — `z.email()` valide le format, jamais la longueur).

⚠️ Une borne posée par `.refine()` est invisible à ce contrat (fonction opaque) : utiliser `.max()`, ou `.pipe(z.string().max(…))` après un `.transform()` — c'est ce que fait `phoneSchema`, qui normalise en E.164 avant de borner.

## Caching

```typescript
// Public data
export async function getProducts() {
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST); // constante SSOT, jamais un littéral
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
	cacheTag(CART_CACHE_TAGS.CART(userId));
	return prisma.cart.findFirst({ where: { userId } });
}
```

### `"use cache"` vs `"use cache: private"` — la clé, ce sont les ARGUMENTS

Next construit la clé d'une entrée à partir de « build ID + hash de la fonction + **arguments sérialisés** + variables de closure ». Une fonction publique qui reçoit `userId` en argument ne peut donc pas servir l'entrée d'un client à un autre : deux `userId` = deux entrées. ⚠️ **Un `cacheTag()` n'est pas la clé** — confondre les deux avait fait basculer 25 fetchers en `private` au nom d'un risque IDOR inexistant (audit 2026-07-31 ; motif corrigé dans `modules/auth/data/get-session.ts`).

Le vrai critère est la **confidentialité**, et il se paie :

| Directive              | Cache serveur | Shell statique | Portée               |
| ---------------------- | ------------- | -------------- | -------------------- |
| `"use cache"`          | oui           | inclus         | partagée             |
| `"use cache: private"` | **aucun**     | **exclu**      | navigateur du client |

`private` n'est **jamais** stocké côté serveur (mémoire du navigateur, non persistée au rechargement) : la requête repart en base à **chaque** rendu serveur — à peser contre le budget compute Neon. À réserver aux données nominatives (panier, favoris, comptes, sessions). Pour du catalogue ou un agrégat, préférer `"use cache"` même quand l'identité sert de paramètre, en s'ajoutant à l'allowlist `PUBLIC_IDENTITY_SCOPED_CACHES` de `cache-scoping.regression.test.ts`. Corollaire : sur une entrée `private`, `cacheLife()` ne gouverne que le cache client, et une invalidation émise depuis un cron ou un webhook ne peut pas l'atteindre.

### Invalidation : l'API dépend du CONTEXTE D'EXÉCUTION, pas du module

| Contexte                                                  | API                                                        | Helper SSOT (`shared/lib/cache.ts`) |
| --------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------- |
| Server Action (`"use server"`)                            | `updateTag(tag)` — read-your-own-writes                    | `updateTagsAfterMutation(tags)`     |
| Route handler, cron, webhook, `after()`, hook Better Auth | `revalidateTag(tag, { expire: 0 })` — expiration immédiate | `revalidateTagsInBackground(tags)`  |

⚠️ **`updateTag` THROW hors Server Action** (`E872`). Next teste la **route en cours d'exécution**, pas le module où l'appel est écrit :

```js
// node_modules/next/dist/server/web/spec-extension/revalidate.js:53
if (!workStore || workStore.page.endsWith("/route")) throw ...;
```

Déléguer l'invalidation à un `services/` ne protège donc de rien — invoqué depuis `app/api/cron/<job>/route.ts`, il throw. C'est ce qui, entre le 2026-07-06 et le 2026-07-31, a fait qu'**aucune invalidation ne s'exécutait après un paiement Stripe** (tâche `INVALIDATE_CACHE` en `FAILED` silencieux → stock vitrine périmé jusqu'à 6 h) ni dans les 7 crons (500 + alerte admin les jours de travail réel).

Ne pas utiliser `revalidateTag(tag, "max")` pour du stock ou un statut : le profil built-in `max` vaut `{ stale: 300, revalidate: 30j, expire: 365j }`, donc l'entrée périmée continue d'être servie.

Trois filets verrouillent la règle, complémentaires : `local/no-update-tag-outside-server-action` (ESLint, à l'écriture) · `shared/lib/__tests__/update-tag-server-action-only.regression.test.ts` (scan repo) · `test/contract/cache-invalidation-context.contract.test.ts` (exerce la **vraie** implémentation Next, sans mock — les 247 fichiers qui font `vi.mock("next/cache")` sont aveugles à cette contrainte, c'est ce qui a laissé passer le bug pendant trois audits).

**4 cache profiles** (next.config.ts):

| Profile     | Stale | Revalidate | Usage                                                       |
| ----------- | ----- | ---------- | ----------------------------------------------------------- |
| `checkout`  | 1m    | 30s        | Cart, session, stock validation, order confirmation         |
| `user`      | 2m    | 1m         | Admin dashboard, user orders, user-scoped data              |
| `catalog`   | 15m   | 5m         | Products, SKUs, related products                            |
| `reference` | 7d    | 24h        | Legal, collections, materials, colors, FAQs, store settings |

**Invalidation des statuts commande (CACHE-AUDIT-010)** : toute mutation de `Order.status`/`paymentStatus` (Server Action, webhook handler, cron) DOIT invalider via `getOrderInvalidationTags(orderId)` (`modules/orders/constants/cache.ts`) — jamais une liste de tags écrite à la main. Le helper couvre les tags par-commande (`DETAIL`, `CONFIRMATION`, `HISTORY`) en plus de `LIST`/`ADMIN_ORDERS_LIST`/`ADMIN_BADGES` ; une liste partielle laisse le détail commande stale jusqu'à l'expiration du profil `user` (~10 min). Choisir l'API d'invalidation selon la matrice contexte → API ci-dessus.

**Tags de cache toujours via une constante SSOT du module, jamais en littéral template.** Un tag écrit à la main ré-implémente une valeur définie ailleurs : renommer le préfixe casse la cascade en silence. Deux occurrences subsistaient dans les cascades couleur/matériau → PDP jusqu'à l'audit 2026-07-31.

**Un tag n'existe que s'il a un lecteur ET un mutateur.** Deux orphelins possibles, tous deux silencieux : un `cacheTag()` que personne n'invalide (l'entrée ne se rafraîchit qu'à expiration) et un `updateTag()` sur un tag que personne ne pose (invalidation dans le vide). Trois vagues d'audit en ont trouvé à chaque passage — `DASHBOARD_CACHE_TAGS` invalidait encore 2 tags fantômes sur 6 via `Object.values(...)`, et `auth-verifications-list` n'avait aucun mutateur. Attention particulière aux mutations passant par `auth.api.*` : elles écrivent en base sans appel Prisma visible, donc aucun garde-fou statique ne les voit.

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

| Fichier                                                | Raison                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments/services/stripe-customer.service.ts`         | Paire atomique Stripe + DB pour checkout                                                                                                                                                                                                                                                 |
| `payments/services/order-creation.service.ts`          | Transaction atomique stock lock + order + discount usage                                                                                                                                                                                                                                 |
| `cart/services/sku-validation.service.ts`              | Validation DB reads partagees entre actions + SKU selector                                                                                                                                                                                                                               |
| `refunds/services/send-refund-confirmation.service.ts` | Émetteur unique email remboursement — `refund.updateMany` claim atomique (`confirmationEmailSentAt`) partagé entre la tâche Maintenance `reconcile-refunds` + webhook `charge.refunded` + action `processRefund` (ORD-STRIPE-005)                                                        |
| `refunds/services/finalize-refund.service.ts`          | Finalisation asynchrone d'un refund Stripe confirmé (claim APPROVED→COMPLETED + restock + paymentStatus + avoir + email) — partagée webhook `refund.updated` + tâche Maintenance `reconcile-refunds` (P1-C audit 2026-08-01) ; retourne les tags, l'appelant invalide selon son contexte |
| `orders/services/archive-credit-note-pdf.service.ts`   | E-invoicing — upload UploadThing + `Order.creditNotePdfHash` SHA-256 (avoir immuable)                                                                                                                                                                                                    |

## API Routes

### Webhooks (`api/webhooks/`)

Stripe webhook handlers with signature verification + idempotency. Logic in `modules/webhooks/`.

### Cron Jobs (`api/cron/`)

**3 Vercel cron jobs** définis dans `vercel.json` (autorité d'exécution réelle) et mirrorés dans `modules/cron/constants/schedules.ts` (SSOT consommé par `with-cron-guard` pour le **Sentry Cron Monitoring** — alerte si un run attendu n'arrive pas, MON-03) ; cohérence des deux verrouillée par `cron-schedules-match-vercel.test.ts`. **Lot 1 SIMPLIFICATION.md (2026-08-03)** : seul le noyau légal/RGPD reste automatique — tout le reste est devenu des **boutons** sur `/admin/configuration/maintenance` (action unique `modules/cron/actions/run-maintenance-task.ts`, SSOT des tâches dans `modules/cron/constants/maintenance-tasks.ts` ; les services cron sont inchangés, seul le déclencheur change).

| Job                      | Schedule (UTC)   | Catégorie | Sentry monitor |
| ------------------------ | ---------------- | --------- | -------------- |
| `reconcile-invoices`     | Daily 2:00       | légal     | ✓ (le seul)    |
| `cleanup-pending-orders` | Daily 3:00       | ops/RGPD  | —              |
| `hard-delete-retention`  | Monthly 2nd 4:00 | RGPD      | —              |

**Tâches manuelles** (page Maintenance) : `retry-webhooks` (Stripe retente déjà 3 j tout seul), `reconcile-refunds` (le nominal passe par le webhook), `sync-async-payments` (checkout card-only, quasi jamais utile), `retry-post-webhook-tasks` (transitoire — disparaît au Lot 2 avec la file PostWebhookTask), `cleanup-orphan-media` (hygiène pure). _Supprimé sans remplacement : `reopen-store` — la lecture (`get-store-status.ts`) traite déjà un `reopensAt` échu comme boutique ouverte, la ligne DB périmée est inoffensive. Retirés antérieurement : `alert-dispute-deadlines` (2026-07-30), `process-account-deletions` (2026-07-31 — la purge RGPD reste portée par `hard-delete-retention`)._

`reconcile-invoices` assure la DLQ facture (numérotation / PDF / avoir — obligation **LIVE** Art. 286/289-I) + les passes de continuité de séquence et d'intégrité des PDF archivés. Logic in `modules/cron/services/` (or domain modules for transactional services).

**⛔ Plafond dur — plan Vercel Hobby : un run par jour et par cron.** Une seule expression infra-journalière (`*/30 * * * *`, `0 * * * *`, `0 */4 * * *`…) fait **refuser le déploiement entier** par l'API Vercel, avant le build : « Hobby accounts are limited to daily cron jobs ». Ce n'est pas une dégradation silencieuse mais une porte fermée, invisible au build local comme au typecheck — la production est restée bloquée dessus (dernier déploiement réussi 38 jours plus tôt) jusqu'au 2026-07-27. Verrouillé par `cron-hobby-plan-daily-limit.regression.test.ts`, qui assert sur `vercel.json` **et** sur la SSOT. Repasser à une cadence infra-journalière exige un plan Pro — et alors ce test doit être supprimé, pas contourné.

Conséquences fonctionnelles assumées : le rejeu des webhooks et des tâches post-paiement dépend désormais d'un **clic de Léane** (au lieu d'un rattrapage quotidien) — Stripe retente lui-même 3 jours, l'alerte admin email signale les échecs, et à ~20 commandes/mois le reliquat se compte en unités.

**⚠️ Budget de réveils DB (audit coûts P1-2)** — chaque exécution réveille Neon, dont le scale-to-zero se déclenche après **5 min** d'inactivité. Un cron plus fréquent que ça maintient la base allumée 24/7 : à `*/5`, `retry-post-webhook-tasks` consommait à lui seul ~95 % des 191,9 compute-hours du plan Free, et au dépassement Neon **suspend la base — boutique KO**. Deux règles, verrouillées par `cron-wakeup-budget.regression.test.ts` : (1) jamais de cadence < 30 min ; (2) grouper les réveils plutôt que de les décaler. Depuis le Lot 1, les 3 jobs tiennent sur **2 fenêtres quotidiennes** (2h, 3h) + la mensuelle (4h le 2), soit ~2 réveils/jour.

**Monitors Sentry** — le monitoring cron est facturé **par monitor** (plan Developer : 1 seul inclus). Depuis le Lot 1, un seul monitor est émis : `reconcile-invoices` (`SENTRY_MONITORED_CRONS` dans `schedules.ts`) — exactement ce que le plan couvre. Les deux autres jobs gardent la capture d'exception + l'alerte admin, mais pas la détection de run manqué.

`cleanup-pending-orders` porte quatre passes ops quotidiennes (commandes PENDING, paniers guest expirés, wishlists guest inactives — garde RGPD art. 5.1.e, seuil `updatedAt` 30 j + 7 j de grâce — et sessions Better Auth expirées, Lot 0 2026-08-03) plutôt que quatre crons — chaque cron supplémentaire est un réveil DB de plus. _La passe « drainage de la file retour en stock » est partie avec le back-in-stock (2026-07-30)._

### Other API Routes

- `api/auth/` - Better Auth handler
- `api/uploadthing/` - UploadThing file upload handler

## Emails

8 templates React Email + Resend (dont 1 polyvalent `AdminAlertEmail`).

**Clients (7)** : order-confirmation, shipping-confirmation, cancel-order-confirmation, refund-confirmed, payment-failed (5 transactionnels) + verification, password-reset (2 auth — **admin uniquement**, cf. § Auth).

⚠️ **Il n'existe plus AUCUN émetteur marketing.** `back-in-stock` est parti avec la catégorie marketing entière (2026-07-30) et `account-deletion` avec le cron d'anonymisation (2026-07-31). Corollaires : plus de `MARKETING_DAILY_EMAIL_BUDGET`, plus d'en-têtes `List-Unsubscribe`, plus d'endpoint `/notifications/desinscription`, et la colonne `User.marketingOptOutAt` a été droppée (migration 20260731100000) — elle n'avait plus de lecteur. Tout futur émetteur marketing devra **re-créer** ce triptyque (budget partagé + en-têtes RFC 8058 + opt-out persisté), pas s'en passer.

_Retirés antérieurement (volume e-mail) : tracking-update + delivery-confirmation (redondants/informatifs), welcome + oauth-account-linked (faible valeur), review-request (déclencheur dormant + colonne `Order.reviewRequestSentAt` absente en base — audit schéma 2026-07-26 ; le système d'avis entier a été retiré le 2026-07-30)._

**Admin (1 template polyvalent)** : `admin-alert-email` paramétré par `type` (refund-failed, webhook-failed, order-processing, dispute, invoice, pdf-archive-failed, credit-note-failed, sequence-overflow, stuck-orders, cron). _Retirés : `admin-new-order-email` (1 mail/commande, dashboard suffit) + sous-type `checkout` (code mort). Le litige n'émet plus qu'une alerte à l'ouverture (pas à la clôture)._

**Anti-doublon** : `idempotencyKey` Resend (24h cross-instance, ex: `order-confirm-${orderId}`, `order-cancel:${orderId}`) + cache LRU in-process 10 min via `send-email.ts`. Pas de flag DB côté Order (KISS).

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

#### Historique baseliné — `0_init` est la PREMIÈRE migration (audit schéma 2026-07-26, amendé 2026-07-30)

`prisma/migrations/` part de `0_init`, qui reconstruit toute la base ; les migrations suivantes sont incrémentales et normales. Les 143 migrations d'avant le baseline sont archivées dans `prisma/migrations-archive/` — conservées comme documentation (chacune porte sa justification légale/technique), mais hors du chemin de Prisma.

⚠️ **Ne JAMAIS éditer `0_init`.** Son checksum est enregistré dans `_prisma_migrations` sur toute base où il a été marqué appliqué : le modifier fait échouer `migrate deploy` (« migration was modified after it was applied »). Une évolution du schéma s'écrit **toujours** dans une nouvelle migration, jamais dans le baseline — y compris pour ajouter un garde brut. Le contract test de parité a lui-même dû être corrigé pour ça (il assertait `dirs === ["0_init"]`, donc rougissait sur la première migration légitime et poussait à éditer le baseline).

**Pourquoi** : l'historique incrémental n'était pas rejouable. 21 tables (`User`, `Session`, `Refund`, `Discount`, `SkuMedia`, `OrderHistory`…) étaient `ALTER`ées sans qu'aucune migration ne les `CREATE` — le renommage `user` → `User` avait été fait hors migrations, et `20260209_schema_sync_and_hardening` s'intitulait elle-même « Syncs schema.prisma with DB state ». `prisma migrate deploy` sur une base vide échouait, et le seul recovery était Neon PITR. Cause racine : `prisma migrate dev` est cassé ici (shadow DB, `P3006`), et le contournement `db execute` + `migrate resolve --applied` marque une migration appliquée **sans vérifier qu'elle reproduit le schéma**.

**Structure de `0_init`** — deux parties, et la seconde est la plus importante :

1. DDL généré par `prisma migrate diff --from-empty --to-schema` (tables, colonnes, enums, FK, index normaux).
2. **Annexe des gardes bruts** — copie de `prisma/sql/raw-guards.sql` : 52 CHECK, 14 index partiels/expression, 2 extensions, 2 fonctions, 2 triggers. **`prisma migrate diff` n'en génère AUCUN.** Un baseline régénéré sans recoller cette annexe perdrait en silence le format de numéro de facture (Art. 286 CGI), le trigger d'unicité cross-table des avoirs, le CHECK singleton `StoreSettings`, la formule de total de commande…

**`prisma/sql/raw-guards.sql` est la SSOT des gardes**, consommée par deux chemins qui doivent rester d'accord : l'annexe de `0_init`, et `test/integration/setup.ts` (appliqué après `db push`). Le fichier est **idempotent** (chaque garde précédé d'un `DROP … IF EXISTS`). Ajouter un garde là ne l'applique pas aux bases existantes : écrire aussi une migration normale.

**Appliquer sur une base existante** (prod) — ne rien exécuter, juste marquer appliqué :

```bash
pnpm prisma migrate resolve --applied 0_init      # DATABASE_URL = endpoint Neon non-poolé
```

**Sur une base vide** (dev, staging, CI) : `pnpm prisma migrate deploy`.

**Garde-fous** (`test/contract/schema-migration-parity.contract.test.ts`, 10 assertions) : parité bidirectionnelle colonne par colonne entre `schema.prisma` et **l'ensemble des migrations** repliées dans l'ordre lexicographique (CREATE/ADD puis DROP) ; présence intégrale des gardes de la SSOT ; `0_init` en première position et un `down.sql` par migration ; chaque garde nommé dans un commentaire de `schema.prisma` ; idempotence de la SSOT ; ordre extensions → fonction → index GIN. Chacune a été prouvée en réintroduisant le défaut qu'elle attrape.

`prisma.config.ts` déclare aussi `shadowDatabaseUrl` (optionnel, `SHADOW_DATABASE_URL`) : pointé sur une base Neon **vide et jetable**, il débloque `prisma migrate dev`, dont l'échec `P3006` est la cause racine de tout ce qui précède. ⚠️ Le lire via `env()` casserait `prisma generate` — donc `pnpm build` — partout où la variable est absente (`env()` est strict) ; d'où le spread conditionnel, verrouillé par `test/contract/prisma-config.contract.test.ts`.

⚠️ Les tests d'intégration appliquent `db push` (pas les migrations) : une colonne déclarée au schéma existe toujours chez eux, même si `0_init` ne la crée pas. C'est le contract test ci-dessus, pas la suite d'intégration, qui protège de ce drift.

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

Synclune est entrepreneur individuel **micro-entreprise franchise TVA** (Art. 293 B CGI). **Seuil de franchise applicable : 85 000 € HT/an (ventes de marchandises — bijoux ; majoré 93 500 €)** ; 37 500 € ne vaut que pour les prestations de services (le `/personnalisation` sur-mesure est une zone grise à arbitrer avec le comptable). Seuil piloté par `VAT_FRANCHISE_THRESHOLD_EUR` (SSOT `shared/constants/vat-franchise.ts`, défaut 85 000 €, validé par `env.schema.ts`) ; le majoré en est dérivé × 1,1 via `getMajoredFranchiseThresholdCents()`. ⚠️ **Les deux seuils n'ont pas la même conséquence** — franchir le seuil de base laisse la franchise acquise jusqu'au 31 décembre, franchir le majoré rend la TVA due dès le 1ᵉʳ du mois de dépassement. `VatProgressCard` annonçait le second dès le premier (audit franchise TVA 2026-07-27, verrouillé par `vat-progress-card.regression.test.tsx`). La mention légale ne s'écrit **jamais en littéral** : toutes les surfaces (PDF facture/avoir, checkout, CGV, mentions légales, email) dérivent de `DEFAULT_FRANCHISE_VAT_MENTION`, verrouillé par `vat-mention-ssot.regression.test.ts` — c'est ce qui rendra la bascule CGI → CIBS (échéance 31/12/2027) atomique. Calendrier réforme : émission/e-reporting B2C obligatoire au **1ᵉʳ septembre 2027**, **réception** au **1ᵉʳ septembre 2026** (échéance la plus proche — obligation **back-office** : s'inscrire auprès d'une PA pour recevoir les factures fournisseurs, pas du code storefront). ⚠️ **L'e-reporting a été RETIRÉ du code le 2026-07-26** (right-sizing) : la machinerie était en dry-run intégral, écrite contre une spec non figée, sans Plateforme Agréée branchée. **À réécrire au go-live** contre l'arrêté définitif et une PA réelle — cf. [`docs/RUNBOOK.md`](docs/RUNBOOK.md). Les invariants ci-dessous gardent le code conforme aux Art. 286 / 289-I / 272-I CGI, L102 B LPF et L123-22 Code de Commerce.

### Invariants intangibles

1. **Aucune création manuelle de facture** depuis l'admin ou ailleurs. Toute facture (`invoiceNumber`) doit passer par `persist-invoice-number.service.ts`, déclenché uniquement par le webhook `payment_intent.succeeded` (eager via `ensure-invoice-number.service.ts`) ou en lazy fallback dans `app/api/orders/[orderNumber]/invoice/route.ts`. Aucune Server Action ne doit écrire `invoiceNumber` ou `creditNoteNumber`. Défense en profondeur (EINV-SEQ-008) : `persistInvoiceNumber` refuse en interne toute commande jamais encaissée (`paidAt` NULL **et** `paymentStatus ≠ PAID`) — Art. 289-I, la garde ne dépend plus des callers.
2. **Aucun avoir manuel.** `creditNoteNumber` (`A-YYYY-NNNNN`) est généré uniquement par `void-invoice.service.ts` (full void Order — appelé depuis `cancel-order`, `mark-as-fully-refunded` et le webhook `charge.refunded`) et `issue-credit-note.service.ts` (avoir partiel Refund), tous deux via la séquence SSOT `credit-note-sequence.service.ts`. Les écritures `Refund.creditNote*` sont verrouillées par leur propre assertion dans `no-manual-invoice-creation.regression.test.ts`.
3. **`OrderHistory` est immuable** — pas de `deletedAt`, pas d'`update`, pas de `delete`. Audit trail comptable Art. L123-22, conservation 10 ans. Corollaire RGPD : un audit `source: CUSTOMER` ne doit JAMAIS dériver `authorName` du client (`user.name`/`user.email`) — libellé neutre `"Client"` + `authorId` (la table n'est pas scrubée à l'anonymisation, la PII y survivrait 10 ans ; régression `order-history-no-customer-pii`).
4. **Snapshots OrderItem figés** au moment du checkout (`productTitle`, `productImageUrl`, `skuColor`, `skuMaterial`, `skuSize`, `price`). Une mutation Product/Sku ne doit jamais modifier un OrderItem existant.
5. **Snapshots adresses figés** sur Order au checkout : les `shipping*` (+ `customer*`) sont copiés champ-à-champ depuis le formulaire dans la tx de création (`order-creation.service.ts`). Les `billing*` restent NULL au checkout (`billingSameAsShipping=true`, design B2C) — seul writer : action admin `update-order-billing-address` (bloquée post-facture) ; la facture retombe sur le shipping via `buildBillingAddress`. Aucune FK `Order→Address` : le modèle `Address` du client évolue indépendamment (une mutation/suppression d'Address ne touche jamais une commande).
6. **PDF immuable post-émission (factures ET avoirs)** : `archive-invoice-pdf.service.ts` upload UploadThing + SHA-256 (`Order.invoicePdfHash`). La route `/api/orders/[orderNumber]/invoice` sert le PDF archivé en priorité (régénération seulement en fallback si fetch UploadThing échoue). **Avoirs (EINV-CREDIT-020)** : l'avoir n'a PAS de snapshot de données (contenu reconstruit depuis les colonnes Order) — son PDF est donc archivé **eagerly à l'émission** (`voidInvoice` → `ensureOrderCreditNoteArchived` ; `issueCreditNoteForRefund` → `ensureRefundCreditNoteArchived`), et rattrapé par `reconcile-invoices` (Passes 3b + 7). ⚠️ Le **troisième filet a disparu** : `ensureUserCreditNotesArchived` bloquait l'anonymisation RGPD tant qu'un avoir émis n'était pas archivé, mais ses deux seuls appelants (`process-account-deletions`, `anonymize-user-immediately`) sont partis avec l'espace client (2026-07-31), donc le service aussi. L'invariant tient sur l'archivage eager + les passes de rattrapage ; **si un chemin d'anonymisation d'utilisateur revient, il DOIT réintroduire cette garde avant son scrub** (verrouillé par `credit-note-eager-archive.regression.test.ts`). Tout rendu d'avoir passe par les SSOT `render-order-credit-note.service.ts` / `render-refund-credit-note.service.ts` (routes + eager + cron : PDF bit-identique au hash archivé). **Intégrité proactive** : la Passe 8 de `reconcile-invoices` (`verify-pdf-archive-integrity.service.ts`) re-hash chaque artefact archivé (rotation ~30 j via `pdfIntegrityCheckedAt` sur Order/Refund) et auto-répare une copie UploadThing corrompue UNIQUEMENT si la régénération est bit-identique au hash DB — le hash, preuve d'immutabilité, n'est JAMAIS réécrit (divergence → alerte admin, intervention manuelle).
7. **Numérotation séquentielle gap-free** : `F-YYYY-NNNNN` pour factures, `A-YYYY-NNNNN` pour avoirs. CHECK constraints DB strictes (`^F-[0-9]{4}-[0-9]{5}$`). Advisory locks Postgres `1_000_000+year` (facture) et `2_000_000+year` (avoir). Sérialisation totale par année. L'unicité cross-table des avoirs (Order ∪ Refund) est en plus verrouillée côté DB par le trigger `check_credit_note_cross_table_unique` (migration 20260709, rejette en 23505/P2002 les écritures contournant le lock). Les 3 tx de séquence utilisent `TX_TIMEOUT_LONG`/`TX_MAX_WAIT_LONG` (l'attente advisory lock compte dans le timeout) et retentent les codes transitoires `RETRYABLE_SEQUENCE_TX_ERROR_CODES` (P2002/P2024/P2028 — sûr car garde d'idempotence re-vérifiée sous lock).
8. **Pas de vente manuelle / pas de caisse.** Aucune Server Action ne doit créer une commande payée sans passer par Stripe (PaymentIntent). Tout flow alternatif (`recordCashSale`, `createManualOrder`, etc.) requiert validation comptable préalable — sinon risque "logiciel de caisse" NF 525 non conforme.
9. **Rétention PII vs RGPD.** ⚠️ Le premier temps du cycle a disparu : l'anonymisation de COMPTE (`anonymize-user.service.ts`) est partie avec l'espace client (2026-07-31) — sans compte client, rien à anonymiser. Ce qu'elle faisait, pour mémoire et pour le jour où un tel chemin reviendrait : scrubber seulement les surfaces _opérationnelles_ (`customer*`, `shipping*`) et NON l'identité légale de la facture (`billing*`, `invoiceDataSnapshot`, PDF) — conservée au titre de l'exemption RGPD Art. 17(3)(b) (obligation Art. 289 CGI / L102 B LPF). Cette identité n'est purgée qu'à `paidAt + 10 ans` par `hard-delete-retention` (`purgeExpiredOrderPii`, marqueur `Order.piiPurgedAt`), respectant la limitation de conservation RGPD Art. 5.1.e. La règle « ne JAMAIS scrubber `billing*` à l'anonymisation » n'a plus de test dédié — `rgpd-anonymize-preserves-invoice-snapshot` est parti avec le service qu'il gardait. Elle reste valable pour tout futur chemin d'anonymisation. Périmètre de la purge 10 ans (SSOT `modules/orders/constants/pii-scrub.ts`, contrat verrouillé par `purge-pii-scrub-contract.regression.test.ts`) : `Order` (opérationnel + `billing*` + snapshot/PDF + `stripeCustomerId`/`stripePaymentIntentId`) **+ `Refund`** (avoirs partiels `creditNotePdfUrl/Hash` + `note` libre) **+ `OrderNote.content`** (texte libre). Corollaire : ne JAMAIS écrire de **valeurs** d'adresse client dans `OrderHistory.metadata` (table immuable, jamais scrubée) — contrat `changedFields` uniquement (régression `order-history-no-customer-pii`). Les commandes jamais payées (aucune base fiscale) sont scrubées à 3 ans (`UNPAID_ORDER_PII_RETENTION_DAYS`).

10. **Le snapshot de facture est VERSIONNÉ, et validé avant d'être figé.** `Order.invoiceDataSnapshot` porte `InvoiceData.formatVersion` — SSOT `INVOICE_DATA_FORMAT_VERSION` (`modules/invoices/constants/invoice-data-format.ts`), **dans le payload donc sous le SHA-256**, jamais dans une colonne (elle serait hors hash et pourrait dériver du contenu qu'elle décrit). Tout changement de forme du payload (ajout, retrait, renommage, changement d'unité ou de sémantique) DOIT incrémenter cette constante et traiter l'ancienne version en lecture : `verifyInvoiceSnapshot` rend le JSONB relu par un `as InvoiceData` — un cast, pas une validation — donc sans marqueur, un champ ajouté vaut `undefined` en silence sur les lignes anciennes, dont le hash reste pourtant valide. Snapshot sans `formatVersion` ⇒ version 1 ; version supérieure à celle du build ⇒ `InvoiceSnapshotVersionError` (503), on refuse de servir plutôt que de réinterpréter. Deux changements sont datés : mention CGI → CIBS au 31/12/2027, réécriture e-reporting au go-live. Le snapshot est en outre validé par `invoiceDataSchema` (cohérence somme des lignes == totaux) **au seul point où il devient immuable** (`persist-invoice-number.service.ts`) : ce refine était documenté comme le filet du renderer mais n'était appelé nulle part en production. Un échec diffère la facture (`invoiceRetryDeferred` → `reconcile-invoices` → alerte admin) au lieu de figer 10 ans un document faux.

### Tests régression dédiés

| Test                                                                                                        | Fichier                                                                                                                                           | Garde                               |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| OrderHistory n'a pas `deletedAt`                                                                            | `modules/orders/services/__tests__/order-history-immutability.regression.test.ts`                                                                 | Audit trail immuable (Art. L123-22) |
| Aucune action admin n'écrit `invoiceNumber`/`creditNoteNumber` directement                                  | `modules/orders/services/__tests__/no-manual-invoice-creation.regression.test.ts`                                                                 | Invariant 1 + 2                     |
| Numérotation : pas de rollover silencieux au-delà de 99999/an                                               | `modules/orders/services/__tests__/persist-invoice-number.service.test.ts` (sous-suite "overflow")                                                | Invariant 7                         |
| Unicité cross-table des numéros d'avoir (trigger DB rejette un doublon Order↔Refund)                        | `modules/invoices/services/__tests__/credit-note-cross-table-unique.integration.test.ts`                                                          | Invariant 7 (EINV-PRISMA-001)       |
| Snapshots adresses Order : writers allowlistés (write-side)                                                 | `order-address-snapshot-immutability.regression.test.ts` (le garde read-side scannait le modèle `Address`, supprimé — retiré au Lot 0 2026-08-03) | Invariant 5                         |
| Purge PII 10 ans : contrat de champs (PII scrubée / comptable préservé) sur Order + Refund + unpaid + notes | `modules/cron/services/__tests__/purge-pii-scrub-contract.regression.test.ts`                                                                     | Invariant 9                         |

### Conformité réglementaire (référencement)

| Article                                    | Localisation                                                           | Statut |
| ------------------------------------------ | ---------------------------------------------------------------------- | ------ |
| Art. 286 CGI — séquentialité gap-free      | `persist-invoice-number.service.ts:50-140` + CHECK DB                  | ✓      |
| Art. 289-I CGI — émission à l'encaissement | `ensure-invoice-number.service.ts:20-46` (ORD-COMPLY-002)              | ✓      |
| Art. 272-I CGI — avoir post-facture        | `void-invoice.service.ts:53-194` (ORD-COMPLY-003)                      | ✓      |
| Art. 293 B CGI — mention franchise TVA     | `render-invoice-pdf.ts:258-263` + SSOT `DEFAULT_FRANCHISE_VAT_MENTION` | ✓      |
| Art. L102 B LPF — immutabilité 10 ans      | `archive-invoice-pdf.service.ts:22-77` (ORD-COMPLY-005)                | ✓      |
| Art. L123-22 C. com. — audit trail         | `OrderHistory` + `createOrderAuditTx`                                  | ✓      |
| Art. 50-0 CGI — CA à l'encaissement        | `export-orders-csv.service.ts:31-60` filtre `paidAt` (ORD-COMPLY-007)  | ✓      |

Modèle d'activité, seuils & périmètre assumé : [`docs/BUSINESS.md`](docs/BUSINESS.md). Procédures opérationnelles (crons, seuils TVA/OSS) : [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

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

- **Rate limiting**: in-memory per-action via `shared/lib/rate-limit.ts` (**fixed counter window** — un `{count,resetAt}` par clé, reset complet à expiry, pas de log d'événements sliding ; 100 req/min IP global + per-action limits). IP extraction Vercel-first : `x-vercel-forwarded-for` → `x-real-ip` → `x-forwarded-for` (les deux premiers sont non-spoofables via l'edge Vercel). Single-instance Node.js : sur Vercel serverless chaque instance a son propre Map, reset au cold-start → protection best-effort contre abus simples, **insuffisant pour DDoS sérieux**. Pour cohérence cross-instance : Upstash Redis ou Arcjet (non installés à ce jour).

  **La clé est `ratelimit:<name>:<identifier>`, et `name` est REQUIS** (`RateLimitConfig.name`, SSOT des 118 presets dans `shared/lib/rate-limit-config.ts` + `modules/media/constants/upload-limits.ts` + `modules/products/constants/search.constants.ts`). Convention : identifiant du const sans `_LIMIT`, en kebab-case. Jusqu'au 2026-07-31 la clé ne portait que l'identifiant : la limite effective de chaque action était alors le **minimum** des limites de toutes celles partageant cet identifiant, avec la fenêtre de la première entrée créée — 5 consultations de fiche produit (`PRODUCT_COOKIE_ACTION`, 30/min) suffisaient à faire répondre 429 au formulaire de connexion (`AUTH_LOGIN`, 5/15 min, sur un `ip:` nu), verrouillant l'unique compte d'administration. Le champ est requis par le type et non optionnel avec repli : un preset qui l'oublierait retomberait en silence sur le compteur partagé. Deux appelants d'un **même** preset partagent toujours une entrée — correct, ils ont les mêmes `limit`/`windowMs` par construction. Verrouillé par `rate-limit-preset-naming.regression.test.ts`.

  ⚠️ **Le 3ᵉ argument `ipAddress` de `checkRateLimit` n'est pas optionnel en pratique.** Sans lui — et le préfixe d'un identifiant non-`ip:` défait aussi l'extraction automatique — `effectiveIp` vaut `null`, donc whitelist, blacklist **et plafond global 100/min/IP** sont tous inertes. Les 3 routes PDF (facture/avoir) l'omettaient, sur l'opération la plus coûteuse en CPU de l'app.

  **Toute Server Action doit appliquer un rate limit** (`enforceRateLimitForCurrentUser` en général), ou figurer dans l'allowlist justifiée de `server-actions-rate-limited.regression.test.ts`. `requireAdmin()` ne dispense pas : il borne QUI appelle, pas COMBIEN de fois. Attention, `"use server"` publie un endpoint RPC atteignable hors UI, et knip le traite comme un point d'entrée — une action non plafonnée n'est signalée par aucun autre outil.

- **Validation**: Zod server-side
- **Unicité `User.email` insensible à la casse** : `@unique` seul est un index Postgres sensible à la casse. Deux gardes DB (`User_email_lowercase` CHECK + `User_email_lower_key` UNIQUE sur `lower(email)`) + normalisation à l'écriture par `databaseHooks.user.{create,update}.before` (point de passage unique des trois chemins : email/mot de passe, Google, `changeEmail`). Sans ça, le garde de compte révoqué de `/sign-in/email` — qui minuscule l'entrée puis compare la colonne en **exact** — laissait se reconnecter un compte suspendu dont l'email était stocké en casse mixte. Verrouillé par `user-email-case-insensitive.regression.test.ts`.
- **RGPD**: Soft deletes, consent tracking, data export
- **Webhooks**: Stripe signature verification + idempotency + 5-minute anti-replay window
- **Security headers** (next.config.ts): CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Uploads**: UploadThing (server-validated). Plafonds SSOT dans `modules/media/constants/upload-size-limits.ts`, alignés sur le FileRouter par `upload-size-limits.regression.test.ts`.
- **Optimiseur d'images**: `images.remotePatterns` (`next.config.ts`) est une **frontière de facturation autant que de sécurité** — `/_next/image` est exclu du matcher de `proxy.ts`, donc sans rate limit. Un hôte à wildcard (`*.ufs.sh` est multi-tenant) laisse n'importe qui faire transformer son contenu aux frais de Synclune. Épinglé sur `UPLOADTHING_APP_IDS` ; verrouillé par `image-remote-patterns.regression.test.ts`.

## Testing Strategy

### Hiérarchie

| Scope               | Déclencheur                                                                                   | Commande                 | Durée cible |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------ | ----------- |
| **Critical path**   | Pre-commit (si modules touchés) + CI PR                                                       | `pnpm test:critical`     | < 10s       |
| **Full unit suite** | CI PR + push main                                                                             | `pnpm test:coverage`     | ~2 min      |
| **Integration DB**  | CI PR (job `tests-integration`, service Postgres) + opt-in local (`INTEGRATION_DATABASE_URL`) | `pnpm test:integration`  | ~30s        |
| **Contract Stripe** | Inclus dans full unit suite                                                                   | (incluse)                | < 5s        |
| **E2E smoke**       | CI PR + push main                                                                             | `pnpm e2e --grep @smoke` | ~3 min      |
| **E2E complet**     | CI PR + push main (sharded ×4)                                                                | `pnpm e2e`               | ~15 min     |

### Critical path (8 modules)

Les modules `cart`, `orders`, `payments`, `webhooks`, `auth`, `discounts`, `refunds`, `invoices` sont les flows transactionnels revenus/sécurité (le module `invoices` porte la numérotation séquentielle gap-free et l'archivage PDF immuable — toute régression y est un risque réglementaire). Leurs tests s'exécutent :

- **Pre-commit local** (hook husky) : uniquement si `git diff --cached` contient un fichier sous ces modules — commit instantané sinon.
- **CI** : job `tests-critical` dédié en parallèle de `quality` pour feedback rapide.

### Ajouter une suite au critical path

1. Étendre le glob du script `test:critical` dans `package.json`.
2. Étendre le regex du hook `.husky/pre-commit`.
3. Mettre à jour cette section.

### Conventions de tests

- Fichiers : `<nom>.test.ts(x)` à côté du code ou dans `__tests__/`.
- **Régression locked** : suffixe `<sujet>.regression.test.ts(x)` + JSDoc `@regression <slug>` en tête. Convention : un test régression verrouille une correction de bug précise — toute modif requiert review explicite. Inventaire vivant via `grep -rn "@regression" --include="*.test.ts*"`. Exemples : `webhook-concurrency.regression.test.ts` (P2002 race), `link-history-back.regression.test.tsx` (Vaul `<DrawerClose asChild>` annule navigation `<Link>`).
- **Integration DB** : suffixe `<nom>.integration.test.ts`, runner séparé (`vitest.integration.config.ts`), DB dédiée via `INTEGRATION_DATABASE_URL`. Import du client via `@/test/integration/prisma-client` UNIQUEMENT (jamais `@/shared/lib/prisma` → refus si URL contient "prod"/"production"). Skip silencieux si env vide en local ; en CI le job `tests-integration` (service Postgres éphémère) les exécute sur chaque PR. ⚠️ Le setup applique `db push` (PAS les migrations) : toute garde raw-SQL (trigger, CHECK) requise par une suite doit être listée dans `RAW_SQL_GUARD_MIGRATIONS` (`test/integration/setup.ts`), fichier idempotent.
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
| UI text     | French, **tutoiement**                |
| Code        | English                               |
| Commits     | `feat:`, `fix:`, `docs:`, `refactor:` |
| Indentation | Tabs                                  |

### Voix : tutoiement, avec une exception

Toute copie utilisateur tutoie. Le mélange n'est pas cosmétique : sur `/paiement`, deux paires étaient **co-visibles** (Alert « Vérifiez votre connexion » au-dessus du hint « Vérifie ta connexion » ; titre « Ta commande » au-dessus d'un tooltip « sur vos commandes »). Audit UI/UX paiement 2026-07-26.

**Seule exception — les messages d'erreur de Stripe.** `stripe.confirmPayment` renvoie pour `card_error`/`validation_error` une `error.message` produite par Stripe en `locale: "fr"`, donc vouvoyante (« Votre carte a été refusée. »). C'est elle qui porte le **motif** du refus, et en card-only c'est le chemin d'erreur le plus fréquent : on l'affiche telle quelle (`use-checkout-submit.ts`, `mapStripeErrorMessage`). Nos propres fallbacks, eux, tutoient. `checkout-voice-tutoiement.regression.test.ts` verrouille le tunnel avec cette allowlist.

⚠️ Les libellés de rate limit (« Trop de tentatives. Veuillez réessayer plus tard. ») sont encore vouvoyants dans une vingtaine de fichiers (`discounts`, `payments`) — dette connue, à traiter en une passe transverse, pas fichier par fichier. Cf. [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md).

## Constats connus, non corrigés

[`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md) recense les défauts reproduits et localisés qu'on a **délibérément** laissés en place parce qu'ils demandent une conception à part entière. Chaque entrée est doublée d'un commentaire `@see docs/KNOWN-ISSUES.md` au site du code. À lire avant de retravailler la resoumission de checkout (KI-001) ou la persistance du formulaire de paiement (KI-002) — pas pour les découvrir une seconde fois.
