# CLAUDE.md

## Project Overview

Synclune - E-commerce bijoux artisanaux (Next.js 16, React 19, TypeScript, Prisma 7, Stripe).

**Qui c'est, et pourquoi ça change les arbitrages** — SSOT `shared/constants/brand.ts` +
`BUSINESS_INFO` (`shared/constants/seo-config.ts`), détail dans [`docs/BUSINESS.md`](docs/BUSINESS.md) :

- **Petite micro-entreprise française**, entrepreneur individuel en **franchise de TVA** (art. 293 B
  CGI), **une seule personne** (Léane, la créatrice) — pas d'équipe technique, pas d'astreinte.
- **Bijoux créatifs et colorés, faits main.** ⚠️ **Pas de la joaillerie précieuse.** La marque
  exprime la créativité colorée de Léane : joyeux, personnel, artisanal. Toute proposition de
  design bâtie sur le métal précieux, la gravure ou le « luxe discret » est le **contre-pied** du
  brief — c'est une erreur déjà commise, ne pas la refaire. « Bijoux » ≠ « joaillerie ».
- **B2C, France + Union Européenne** (27 États + Monaco), **français et EUR uniquement** (choix
  assumés, pas des manques), ~**20 commandes/mois** visées.

Ce profil est ce qui justifie la plupart des choix qui suivent : boutons admin plutôt que crons,
rate limiting en mémoire, pas de i18n, pas de multi-devise, un seul compte administrateur. Une
recommandation qui présuppose une équipe, un trafic ou un catalogue plus gros passe à côté.

- **Storefront** (`/`, groupe de routes `(shop)`) - Produits, panier, paiement
- **Admin** (`/admin`) - Catalogue, commandes, analytics
- **Stripe** - Paiements, webhooks, remboursements
- **Emails** - React Email + Resend (8 templates)
- **Auth** - Connexion **réservée à l'administration** : pas de compte client, inscription fermée (retrait de l'espace client 2026-07-31)

## Commands

**Avant toute PR : `pnpm validate`.**

```bash
pnpm validate               # lint + typecheck + format:check + vitest run — LE gate
pnpm dev                    # Dev server
pnpm build                  # Build (prisma generate + next build --turbopack)
pnpm start                  # Production server

# Tests
pnpm test                   # Vitest (suite complète)
pnpm test <chemin>          # Une seule suite / un seul fichier
pnpm test:critical          # 8 modules transactionnels (= ce que lance le hook pre-commit)
pnpm test:coverage          # Suite complète + couverture
pnpm test:integration       # Requiert INTEGRATION_DATABASE_URL (skip silencieux sinon)
pnpm e2e                    # Playwright E2E
pnpm e2e:ui                 # Playwright UI mode

# Qualité
pnpm lint                   # ESLint
pnpm typecheck              # tsc --noEmit
pnpm format                 # Prettier (write)
pnpm format:check           # Prettier (check only)
pnpm knip                   # Exports morts (traite "use server" comme point d'entrée)
pnpm doctor                 # react-doctor --offline  (`doctor:full` pour le rapport complet)
pnpm size                   # size-limit (`size:check` pour la sortie JSON)
pnpm analyse                # Bundle analysis

# Base de données
pnpm seed                   # Seed
pnpm db:studio              # Prisma Studio GUI
pnpm db:push                # Schéma → base, sans migration (dev)
pnpm db:migrate             # prisma migrate dev — requiert SHADOW_DATABASE_URL, cf. § Migrations
pnpm db:reset               # migrate reset + seed  ⚠️ DESTRUCTIF

# Divers
pnpm email:dev              # Preview emails (port 3001)
pnpm docs:stripe            # Mirror local de la doc Stripe → docs/stripe/
```

## Architecture

```
app/
├── (auth)/                  # Connexion (admin), mot-de-passe, verification email
├── (shop)/                  # Storefront (accueil, produits, collections, creations, favoris, aide)
├── (legal)/                 # Pages legales (CGV, mentions, confidentialite)
├── admin/                   # Dashboard admin (catalogue, commandes, marketing, contenu)
├── api/                     # admin, auth, cron, csp-report, health, noop, orders, uploadthing, webhooks
├── paiement/                # Pages paiement (confirmation, annulation, retour)
├── suivi-commande/          # Suivi de commande invite (token HMAC) — SEUL acces client a une commande
└── sitemap-images.xml/      # Generation sitemap images

modules/                     # DDD - 21 modules
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
│   └── lib/                 # Module-specific config (auth, cart, cron, media, refunds, wishlist)
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
├── hooks/                   # ~30 hooks (filtres, media queries, touch, overlays, formulaires)
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
- **UI**: shadcn/ui sur **Base UI** (`@base-ui/react`, socle par défaut de shadcn depuis 07/2026) + Tailwind + Motion (v12, `motion/react`)
- **Uploads**: UploadThing
- **Monitoring**: Sentry (error tracking, tunnel via `/monitoring`)

### Conventions UI — le détail vit dans [`docs/UI-CONVENTIONS.md`](docs/UI-CONVENTIONS.md)

**À lire avant de toucher à un composant.** Les règles ci-dessous sont les invariants ; leur
_pourquoi_, les contre-exemples et les pièges de migration Radix → Base UI sont dans ce document.

- **Breakpoints en rem, jamais en px** — aucune largeur en px dans un `matchMedia()`, une media query manuelle ou un `--breakpoint-*`. SSOT `shared/constants/breakpoints.ts`. Un seuil JS en px décroche du CSS Tailwind dès que la police racine n'est plus à 16px (WCAG 1.4.4), et les composants **hybrides** tombent alors dans le vide. Verrouillé par `no-px-media-query.regression.test.ts`.
- **Seuils de navigation** : bottom-nav boutique à `lg` (couvre l'iPad portrait), bottom bar + sidebar admin à `md`. `--bottom-bar-height` vaut déjà 0 quand la barre est absente — ne pas préfixer son offset d'un breakpoint.
- **Plafonds de contenu** : storefront `max-w-6xl`, checkout `max-w-5xl`, admin `max-w-[100rem]` **sans `mx-auto`**. ⚠️ **Un palier de colonnes ne s'ajoute que si le conteneur grandit avec lui** — au-delà du plafond, une colonne de plus rétrécit les cartes.
- **Survol ⇒ focus** pour toute affordance porteuse d'information (WCAG 2.4.7). ⚠️ **Jamais de règle de focus derrière `can-hover:`** : elle ne s'appliquerait jamais au clavier sur tactile. Gater le hover seul — et gater le **masquage**, pas la révélation, sinon le CTA reste cliquable en `opacity-0` sur iPad.
- **Overlays** : `ResponsiveAlertDialog` (confirmation — ⚠️ ne bascule pas), `ResponsiveDialog` (formulaire, bascule sur `md`), `Sheet` (panneau persistant), `Drawer` (feuille éphémère). Les 4 sont des couches Base UI : **une seule pile de dismiss**, donc migrer une famille sans les autres est interdit. Un overlay enfant se rend **dans** l'arbre JSX du parent.
- ⚠️ **Jamais `<SheetClose render={…}>` / `<DrawerClose render={…}>` autour d'un `<Link>`** — `history.back()` race le `router.push` et annule la navigation, sans erreur visible. Fermer par la prop contrôlée, naviguer en `replace`.
- **`render`, jamais `asChild`** — Base UI n'a pas de `Slot`, et la règle **n'a pas d'exception** : plus aucun `asChild` dans le dépôt. `render` déplace l'ÉLÉMENT, pas les enfants.
- **`data-*` booléens, plus de `data-state`** — `data-open:` et non `data-[state=open]:`. ⚠️ `Menu.Item` / `Select.Item` ne prennent pas le focus DOM : c'est `data-highlighted:`, jamais `focus:`.
- **`handleOnly`** : uniquement sur collision de gestes constatée et commentée sur le call site. Verrouillé par `handle-only-allowlist.regression.test.ts`.
- **Panneaux : une TRANSITION, pas une animation keyframes** — une `animate-in` écraserait le translate piloté par le geste.
- **Icônes : Phosphor, importées depuis `@phosphor-icons/react/ssr`** (migration du 2026-08-04 ; `lucide-react` est retiré). La racine du paquet tire ~9000 modules et ses composants CSR lisent `IconContext` — ils cassent **au rendu** en Server Component ; seuls les `import type` (`Icon`, `IconProps`) la visent. Le poids `regular` vaut exactement le trait **1,5** des SVG maison, donc **`weight`, jamais `strokeWidth`** : Phosphor peint en `fill`, la prop de trait n'a aucun effet et une classe `fill-*` ne remplit rien. ⚠️ Chaque icône embarque ses **6 graisses** dans un module unique, intreeshakable (~5× le gzip d'une icône lucide) : le seul levier de poids est le nombre d'icônes **distinctes** par route. Verrouillé par `phosphor-ssr-entry.regression.test.ts`.

### React 19 - NO MEMOIZATION

Le compilateur React 19 optimise automatiquement. **NE PAS utiliser:**

- `useMemo()`, `useCallback()`, `React.memo()`

## Catalogue — invariants

### Tous les `select` Prisma du catalogue vivent dans `constants/`

Les 5 selects produit dans `modules/products/constants/product.constants.ts`, les 3 selects collection dans `modules/collections/constants/collection.constants.ts`, les 2 selects type dans `modules/product-types/constants/product-type.constants.ts`.

**Ne pas écrire un `select` en ligne dans une fonction `data/`** : un select invisible rate les migrations de schéma. C'est arrivé à celui de la duplication (les autres, rangés ici, avaient été mis à jour) — « Dupliquer un produit » a répondu « Le produit source n'existe pas » pendant ~2,5 mois.

Deux garde-fous, tous deux **sans base de données** :

- `catalogue-selects-schema-validity.regression.test.ts` — soumet les selects au validateur Prisma via un client sur port fermé : Prisma valide côté client **avant** de connecter, donc une clé inconnue lève `PrismaClientValidationError` là où une clé valide échoue seulement sur la connexion. ⚠️ C'est le seul filet sur ce trou : **`tsc` accepte silencieusement une clé inexistante dans un `select`** (un `@ts-expect-error` y est signalé _inutile_), et les tests d'intégration sont skippés sans `INTEGRATION_DATABASE_URL`.
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
- Il n'y a **pas** de `restore-product` : `deleteProduct` purge les `ProductCollection`. Ni panier ni favoris à purger — les deux vivent dans les cookies de chaque navigateur (`cart` 2026-08-04, `wishlist` 2026-08-03), où un id supprimé devient simplement inerte. Archiver (`ARCHIVED`) est le chemin réversible ; supprimer ne l'est pas.
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

Tout le parcours d'achat est **invité** :

- **panier en cookie** (`cart`, lignes SKU + quantité + prix témoin + code promo, httpOnly 7 j glissants). Plus de tables `Cart`/`CartItem` — SSOT `modules/cart/lib/cart-cookie.ts` ;
- **favoris en cookie** (`wishlist`, array de Product IDs, httpOnly 30 j glissants). Plus de tables `Wishlist`/`WishlistItem` — SSOT `modules/wishlist/lib/wishlist-cookie.ts` ;
- **checkout sans session** (`confirmCheckout`) ;
- **consultation de commande par lien tokenisé** de l'email de confirmation (`/suivi-commande`, HMAC via `buildOrderTrackingUrl` — SSOT à une seule branche, cf. `order-tracking-url.regression.test.ts`).

Il n'y a plus de fusion post-login : une donnée invitée **reste** invitée.

⚠️ **`Order.userId` a disparu le 2026-08-05** (audit schéma V1, Lot C) : toujours NULL en achat invité, et ses deux gardes court-circuitaient déjà dessus. Trois conséquences à connaître — les routes facture/avoir n'ont plus qu'un seul chemin client, le **token HMAC signé** ; `/credit-note/[refundId]` devient **admin-only** (elle n'a jamais eu de token invité) ; `isInvoiceOwnerErased` a disparu avec elle. **Si un compte client revient, il faut réintroduire la colonne ET cette garde avant tout chemin d'anonymisation RGPD.**

Ce qui n'a **pas** disparu, et qu'il ne faut donc pas « nettoyer » : `AccountStatus` (surface de révocation du compte admin — `ANONYMIZED` reste lu par la garde de connexion d'`auth.ts` même si plus rien ne l'écrit), et `Session`/`Account`/`Verification` (Better Auth y range le hash du mot de passe et les tokens de reset — son adapter écrit ET relit leurs `createdAt`/`updatedAt`, hors de portée de tout dégraissage).

### Panier en cookie — trois corollaires qui ne se devinent pas

**1. `cart_session` n'est plus une session PANIER.** Le cookie survit au drop des tables, et sous son ancien nom : il porte la garde d'ownership du PaymentIntent (`metadata.guestSessionId`, CHECKOUT-IDOR-001) et l'identité de rate limiting. Le renommer invaliderait la garde de tout PI créé avant le déploiement — le client verrait « Accès non autorisé au paiement » en cliquant Payer. SSOT `modules/cart/lib/guest-session.ts`.

**2. Un webhook ne peut PAS vider le panier** — un appel serveur-à-serveur ne porte aucun cookie du client. Le vidage revient à `clearCartAfterOrder`, au montage de `/paiement/confirmation`. ⚠️ Surtout **pas** depuis `confirmCheckout` : elle s'exécute AVANT la confirmation Stripe, donc une carte refusée y viderait le panier d'un client qui doit justement pouvoir réessayer. Angle mort assumé : qui ferme l'onglet sans revenir garde son cookie.

**3. `priceAtAdd` vit dans le cookie sans être une faille — grâce à une garde amont.** C'est un **témoin d'affichage**, jamais une base de facturation : `computeCartSubtotal` re-lit `sku.priceInclTax` en base, et `confirmCheckout` **refuse** la commande si le témoin diverge du prix DB. Ne jamais dériver un montant facturé de cette valeur ; `addToCart` relit toujours le prix en base et **ignore** tout `priceAtAdd` soumis par le client.

Conséquence de portée plus large : rien côté serveur ne voit les paniers. Pas de compteur « Dans X paniers » (il agrégerait les paniers des AUTRES visiteurs), et `delete-sku` ne refuse plus une variante « présente dans N paniers » — la ligne du cookie devient simplement inerte. La garde `orderItems`, elle, reste : c'est celle qui protège l'historique comptable.

**Auth helpers** (`modules/auth/lib/require-auth`):

- `requireAuth()` - Verifies user authenticated + exists in DB (filtre `suspendedAt:null` + `accountStatus=ACTIVE`). ⚠️ En pratique, « authentifié » ne peut plus vouloir dire qu'« admin » — ce helper reste distinct de `requireAdmin*()` parce qu'il ne vérifie PAS le rôle.
- `requireAdmin()` - Verifies ADMIN role **avec re-vérification DB** (bloque admin rétrogradé/supprimé/suspendu) ; ne renvoie pas l'objet user
- `requireAdminWithUser()` - Idem `requireAdmin()` (re-check DB) + renvoie l'objet user
- `requireAdminApiRoute()` - Variante route handler (renvoie une `Response` HTTP) ; re-check DB du rôle
- `requireActiveAccountIfAuthenticated()` - Autorise les invités (pas de session) mais rejette une session dont le compte n'est pas `ACTIVE` (suspendu/INACTIVE). Pour les flux commerce optionnellement authentifiés (checkout, discount) — **le cas nominal est désormais « pas de session »**, la branche session ne couvrant plus que l'administratrice qui achèterait sur sa propre boutique
- `isVerifiedAdmin(session)` - Variante **booléenne** (ne bloque pas) avec re-check DB, pour les branches de privilège optionnelles (ex: bypass admin de la garde « boutique fermée »). Prend la session en argument ; court-circuite sans query si le cookie ne prétend pas admin
- `isAdmin()` (`modules/auth/utils/guards`) - Wrapper sans argument de `isVerifiedAdmin()` (résout la session + `cache()` de déduplication par requête). Garde des lectures admin de la couche `data/`, où un retour `ActionState` n'a pas de sens

> ⚠️ Ne JAMAIS faire confiance à `session.user.role` pour un chemin de privilège. Toujours passer par un helper `requireAdmin*` / `isVerifiedAdmin()` / `isAdmin()` qui re-vérifie en DB. Verrouillé par le garde-fou statique `modules/auth/utils/__tests__/no-raw-session-role-trust.regression.test.ts` (allowlist explicite pour le pré-filtre de `require-auth` et l'affichage cosmétique), doublé d'une assertion qui interdit à tout autre fichier de ré-implémenter le re-check en base.

**Pourquoi la fenêtre existe** : tant que le cookie-cache Better Auth est valide, `auth.api.getSession()` répond depuis le cookie signé **sans aucune lecture en base** — le plugin `customSession`, celui qui dégrade le rôle à `USER` pour un compte révoqué, ne s'exécute même pas. La latence de révocation de toute l'application vaut donc exactement `AUTH_SESSION_CONFIG.cookieCache.maxAge` (**60 s**, `modules/auth/lib/auth-env.ts`). ⚠️ **Supprimer les lignes `Session` ne coupe rien avant cette expiration**, et relever ce réglage rallonge d'autant la fenêtre.

**Le re-check doit porter sur le STATUT DE COMPTE, pas seulement sur le rôle.** `fetchUserForAuth()` filtre `deletedAt` + `suspendedAt` + `accountStatus = ACTIVE` — c'est la **seule** implémentation, mémoïsée par `cache()` (portée requête). Une copie qui ne lisait que `role` laissait un admin _suspendu_ garder le bypass d'ownership sur les PDF facture/avoir ; d'où l'assertion qui interdit de ré-implémenter le re-check ailleurs.

**Chaque `app/admin/**/page.tsx` appelle `assertAdminPage()`**, en plus du `requireAdminWithUser()` du layout. Un layout partagé n'est **pas** ré-exécuté lors d'une navigation client entre routes qui le partagent, et le pré-filtre de `proxy.ts` est fail-open dès que le cookie-cache a expiré. Verrouillé par `app/admin/__tests__/admin-page-auth-guard.regression.test.ts`, volontairement **sans allowlist** : classer fetcher par fetcher ce qui est donnée publique (`getMaterialOptions` alimente aussi les filtres de `/produits`) ou donnée admin est un arbitrage qui se re-perd.

**Révoquer une session** : `/admin/configuration/securite` (action `revokeAllSessions`), ou la procédure SQL de secours du [`RUNBOOK`](docs/RUNBOOK.md#-compte-admin-compromis--révoquer-les-sessions).

**Action helpers** (`shared/lib/actions/`):

- `success()`, `error()`, `notFound()`, `unauthorized()`, `forbidden()`, `validationError()` - Responses
- `validateInput()` - Zod validation
- `handleActionError()`, `BusinessError` - Error handling
- `enforceRateLimit()` - Rate limiting

**Validation patterns** — deux patterns coexistent légitimement :

- **`validateInput(schema, data)`** — le défaut, pour toute Server Action qui retourne `ActionState`. Rend `{ data } | { error: ActionState }`, usage en `if ("error" in validation) return validation.error`.
- **`schema.safeParse(data)` direct** — uniquement si l'action retourne un **type custom** (ex. `quick-search.ts`) ou a besoin du **`path` Zod** pour cibler le champ fautif (ex. `skus/{create,update}`). Tout nouveau cas exige une raison documentée.

### Une Server Action VALIDE son argument, elle ne se contente pas de l'annoter

Un fichier `"use server"` transforme **chacun de ses exports** en endpoint RPC appelable directement, avec des arguments arbitraires : le type TypeScript du paramètre est effacé à l'exécution. `key: FabKey`, `paymentIntentId: string` ou `productId: string` ne garantissent rien.

Corollaire régulièrement raté : **un helper appelé par une Server Action ne doit jamais vivre dans un module `"use server"`**. Le wrapper a beau valider, le wrappé reste exposé séparément — c'est ainsi que `toggleFabVisibility` a pu écrire un cookie dont le nom dérivait d'un argument non validé, sans Zod, sans auth, sans rate limit. Soit le helper est inline, soit son fichier n'a pas la directive.

Deuxième corollaire : **parser AVANT de dériver quoi que ce soit de l'argument**. `confirmCheckout` construisait sa clé de rate limit (`checkout-confirm:guest:<email>:<ip>`) à partir de `data.email` une dizaine de lignes avant son `safeParse` — un invité qui variait son email obtenait un compteur neuf à chaque requête. Les trois actions de paiement déclarent désormais `unknown` et parsent en tête.

Verrouillé par `test/contract/server-action-input-validation.contract.test.ts` (scan repo, allowlist motivée) et `checkout-validate-before-rate-limit.regression.test.ts`.

### Longueurs Zod ↔ colonnes Prisma

Toute string Zod persistée dans une colonne `@db.VarChar(n)` doit porter un `.max()` ≤ `n`, et être déclarée dans `test/contract/zod-prisma-length-parity.contract.test.ts`.

Ni `tsc` ni les tests d'intégration ne voient ce trou : le type d'une colonne `VarChar(n)` est `string`, et `db push` accepte n'importe quelle longueur tant qu'aucune ligne trop longue n'est écrite. En production, c'est un `22001` Postgres **dans la transaction**, rendu à l'utilisateur en « Une erreur est survenue » sans indication du champ. Un seul audit en a trouvé six d'un coup. ⚠️ Piège classique : `z.email()` valide le format, **jamais la longueur**.

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

// Données de cookie - wrapper pattern (cookies/headers incompatibles avec "use cache").
// Le cookie porte les ids ; seule leur MATÉRIALISATION est cachée, et elle l'est
// en PUBLIC : la clé d'une entrée, ce sont les arguments — ici du catalogue pur.
export async function getCart() {
	const { items } = await readCartCookie();
	const skus = await fetchCartSkus(items.map((i) => i.skuId));
	return joinCookieWithSkus(items, skus);
}

async function fetchCartSkus(skuIds: string[]) {
	"use cache";
	cacheLife("checkout");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);
	return prisma.productSku.findMany({ where: { id: { in: skuIds } } });
}
```

### `"use cache"` vs `"use cache: private"` — la clé, ce sont les ARGUMENTS

Next construit la clé d'une entrée à partir de « build ID + hash de la fonction + **arguments sérialisés** + variables de closure ». Une fonction publique qui reçoit `userId` en argument ne peut donc pas servir l'entrée d'un client à un autre : deux `userId` = deux entrées. ⚠️ **Un `cacheTag()` n'est pas la clé** — confondre les deux avait fait basculer 25 fetchers en `private` au nom d'un risque IDOR inexistant (audit 2026-07-31 ; motif corrigé dans `modules/auth/lib/get-current-session.ts`).

Le vrai critère est la **confidentialité**, et il se paie :

| Directive              | Cache serveur | Shell statique | Portée               |
| ---------------------- | ------------- | -------------- | -------------------- |
| `"use cache"`          | oui           | inclus         | partagée             |
| `"use cache: private"` | **aucun**     | **exclu**      | navigateur du client |

`private` n'est **jamais** stocké côté serveur (mémoire du navigateur, non persistée au rechargement) : la requête repart en base à **chaque** rendu serveur — à peser contre le budget compute Neon. À réserver aux données nominatives (comptes, sessions — ni le panier ni les favoris n'en font plus partie : les cookies `cart` et `wishlist` portent les ids, et leur matérialisation catalogue est un `"use cache"` **public** keyé sur eux). Pour du catalogue ou un agrégat, préférer `"use cache"` même quand l'identité sert de paramètre, en s'ajoutant à l'allowlist `PUBLIC_IDENTITY_SCOPED_CACHES` de `cache-scoping.regression.test.ts`. Corollaire : sur une entrée `private`, `cacheLife()` ne gouverne que le cache client, et une invalidation émise depuis un cron ou un webhook ne peut pas l'atteindre.

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

Déléguer l'invalidation à un `services/` ne protège donc de rien — invoqué depuis `app/api/cron/<job>/route.ts`, il throw. Ça a déjà coûté 3 semaines pendant lesquelles **aucune invalidation ne s'exécutait après un paiement Stripe** (échec silencieux → stock vitrine périmé jusqu'à 6 h).

Ne pas utiliser `revalidateTag(tag, "max")` pour du stock ou un statut : le profil built-in `max` vaut `{ stale: 300, revalidate: 30j, expire: 365j }`, donc l'entrée périmée continue d'être servie.

Trois filets verrouillent la règle, complémentaires : `local/no-update-tag-outside-server-action` (ESLint, à l'écriture) · `shared/lib/__tests__/update-tag-server-action-only.regression.test.ts` (scan repo) · `test/contract/cache-invalidation-context.contract.test.ts` (exerce la **vraie** implémentation Next, sans mock — les très nombreux fichiers qui font `vi.mock("next/cache")` sont aveugles à cette contrainte, c'est ce qui a laissé passer le bug pendant trois audits).

**4 cache profiles** (next.config.ts):

| Profile     | Stale | Revalidate | Usage                                                         |
| ----------- | ----- | ---------- | ------------------------------------------------------------- |
| `checkout`  | 1m    | 30s        | SKUs du panier, session, stock validation, order confirmation |
| `user`      | 2m    | 1m         | Admin dashboard, user orders, user-scoped data                |
| `catalog`   | 15m   | 5m         | Products, SKUs, related products                              |
| `reference` | 7d    | 24h        | Legal, collections, materials, colors, FAQs, store settings   |

**Invalidation des statuts commande (CACHE-AUDIT-010)** : toute mutation de `Order.status`/`paymentStatus` (Server Action, webhook handler, cron) DOIT invalider via `getOrderInvalidationTags(orderId)` (`modules/orders/constants/cache.ts`) — jamais une liste de tags écrite à la main. Le helper couvre les tags par-commande (`DETAIL`, `CONFIRMATION`, `HISTORY`) en plus de `LIST`/`ADMIN_ORDERS_LIST`/`ADMIN_BADGES` ; une liste partielle laisse le détail commande stale jusqu'à l'expiration du profil `user` (~10 min). Choisir l'API d'invalidation selon la matrice contexte → API ci-dessus.

**Tags de cache toujours via une constante SSOT du module, jamais en littéral template.** Un tag écrit à la main ré-implémente une valeur définie ailleurs : renommer le préfixe casse la cascade en silence.

**Un tag n'existe que s'il a un lecteur ET un mutateur.** Deux orphelins possibles, tous deux silencieux : un `cacheTag()` que personne n'invalide (l'entrée ne se rafraîchit qu'à expiration) et un `updateTag()` sur un tag que personne ne pose (invalidation dans le vide). Trois vagues d'audit en ont trouvé à chaque passage — c'est une erreur qui se refait. ⚠️ Attention particulière aux mutations passant par `auth.api.*` : elles écrivent en base **sans appel Prisma visible**, donc aucun garde-fou statique ne les voit.

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

Fonctions pures sans effets de bord. Pas de `"use server"`, pas de mutations DB. C'est là que
vivent les constructeurs de `where` (`buildOrderWhereClause` dans
`modules/orders/services/order-query-builder.ts`), appelés depuis `data/`.

### actions/ - Server Actions (mutations)

Mutations avec auth, validation, rate limit, DB write, invalidation de cache — dans cet ordre.
Squelette : cf. § [Server Actions Pattern](#server-actions-pattern) ci-dessus.

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

| Fichier                                                | Raison                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments/services/stripe-customer.service.ts`         | Paire atomique Stripe + DB pour checkout                                                                                                                                                                                                                                                                               |
| `payments/services/order-creation.service.ts`          | Transaction atomique stock lock + order + discount usage                                                                                                                                                                                                                                                               |
| `cart/services/sku-validation.service.ts`              | Validation DB reads partagees entre actions + SKU selector                                                                                                                                                                                                                                                             |
| `refunds/services/send-refund-confirmation.service.ts` | Émetteur **unique** de l'email de remboursement — claim atomique via `refund.updateMany` (`confirmationEmailSentAt`), partagé entre la tâche Maintenance `reconcile-refunds` et le webhook `charge.refunded`                                                                                                           |
| `refunds/services/finalize-refund.service.ts`          | Finalisation asynchrone d'un refund Stripe confirmé (claim APPROVED→COMPLETED + paymentStatus + avoir + email). Partagée webhook `refund.updated` / tâche `reconcile-refunds` ; **retourne les tags, l'appelant invalide selon son contexte**. ⚠️ Pas de restock automatique : c'est un ajustement manuel de stock SKU |
| `orders/services/archive-credit-note-pdf.service.ts`   | E-invoicing — upload UploadThing + `Order.creditNotePdfHash` SHA-256 (avoir immuable)                                                                                                                                                                                                                                  |

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

**Tâches manuelles** (page Maintenance, SSOT `modules/cron/constants/maintenance-tasks.ts`) — elles sont **3** : `reconcile-refunds` (le nominal passe par le webhook), `sync-async-payments` (checkout card-only, quasi jamais utile), `cleanup-orphan-media` (hygiène pure). ⚠️ Le nom `PostWebhookTask` qui subsiste dans `modules/webhooks/` est un **type TypeScript**, plus un modèle Prisma.

⚠️ **`retry-webhooks` a été retiré le 2026-08-05** (audit V2, Lot 3) : c'était un **troisième** système de reprise empilé sur deux qui sont durables par construction. La route webhook renvoie un **500** en cas d'échec, donc Stripe redélivre seul pendant 3 jours (et ré-incrémente `attempts`, qui alimente toujours l'alerte admin) ; les conséquences métier sont rattrapées par les tâches de réconciliation. Conséquence assumée : passé J+3, un event se rejoue depuis le **dashboard Stripe**, plus depuis l'admin — cf. [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md) (KI-006). Ne pas le réintroduire sans l'un des signaux de réouverture qui y sont listés.

`reconcile-invoices` assure la DLQ facture (numérotation / PDF / avoir — obligation **LIVE** Art. 286/289-I) + les passes de continuité de séquence et d'intégrité des PDF archivés. Logic in `modules/cron/services/` (or domain modules for transactional services).

**⛔ Plafond dur — plan Vercel Hobby : un run par jour et par cron.** Une seule expression infra-journalière (`*/30 * * * *`, `0 * * * *`, `0 */4 * * *`…) fait **refuser le déploiement entier** par l'API Vercel, avant le build : « Hobby accounts are limited to daily cron jobs ». Ce n'est pas une dégradation silencieuse mais une porte fermée, invisible au build local comme au typecheck (elle a déjà bloqué la production 38 jours). Verrouillé par `cron-hobby-plan-daily-limit.regression.test.ts`, qui assert sur `vercel.json` **et** sur la SSOT. Repasser à une cadence infra-journalière exige un plan Pro — et alors ce test doit être supprimé, pas contourné.

Conséquences fonctionnelles assumées : le rejeu des webhooks et des tâches post-paiement dépend désormais d'un **clic de Léane** (au lieu d'un rattrapage quotidien) — Stripe retente lui-même 3 jours, l'alerte admin email signale les échecs, et à ~20 commandes/mois le reliquat se compte en unités.

**⚠️ Budget de réveils DB** — chaque exécution réveille Neon, dont le scale-to-zero se déclenche après **5 min** d'inactivité. Un cron plus fréquent que ça maintient la base allumée 24/7 ; au dépassement du plan Free, Neon **suspend la base — boutique KO**. Deux règles, verrouillées par `cron-wakeup-budget.regression.test.ts` : (1) jamais de cadence < 30 min ; (2) grouper les réveils plutôt que de les décaler. Les 3 jobs tiennent sur **2 fenêtres quotidiennes** (2h, 3h) + la mensuelle (4h le 2), soit ~2 réveils/jour.

**Monitors Sentry** — le monitoring cron est facturé **par monitor** (plan Developer : 1 seul inclus). Depuis le Lot 1, un seul monitor est émis : `reconcile-invoices` (`SENTRY_MONITORED_CRONS` dans `schedules.ts`) — exactement ce que le plan couvre. Les deux autres jobs gardent la capture d'exception + l'alerte admin, mais pas la détection de run manqué.

`cleanup-pending-orders` porte deux passes ops quotidiennes (commandes PENDING, puis sessions Better Auth expirées) plutôt que deux crons — chaque cron supplémentaire est un réveil DB de plus.

### Other API Routes

- `api/orders/[orderNumber]/` - `invoice`, `credit-note[/refundId]`, `status` — **les seules routes qui servent un PDF fiscal** (cf. § Facturation électronique). Accès invité par token HMAC, ou bypass admin via `isVerifiedAdmin()`.
- `api/admin/orders/export/` - Export CSV du livre de recettes (Art. 50-0 CGI)
- `api/auth/` - Better Auth handler
- `api/uploadthing/` - UploadThing file upload handler
- `api/health/`, `api/csp-report/`, `api/noop/` - Sonde, collecte des violations CSP, no-op

## Emails

8 templates React Email + Resend (dont 1 polyvalent `AdminAlertEmail`).

**Clients (7)** : order-confirmation, shipping-confirmation, cancel-order-confirmation, refund-confirmed, payment-failed (5 transactionnels) + verification, password-reset (2 auth — **admin uniquement**, cf. § Auth).

⚠️ **Il n'existe plus AUCUN émetteur marketing** — donc plus de `MARKETING_DAILY_EMAIL_BUDGET`, plus d'en-têtes `List-Unsubscribe`, plus d'endpoint de désinscription, plus de `User.marketingOptOutAt`. Tout futur émetteur marketing devra **re-créer** ce triptyque (budget partagé + en-têtes RFC 8058 + opt-out persisté), pas s'en passer.

**Admin (1 template polyvalent)** : `admin-alert-email` paramétré par `type` (refund-failed, webhook-failed, order-processing, dispute, invoice, pdf-archive-failed, credit-note-failed, sequence-overflow, stuck-orders, cron). Le litige n'émet qu'une alerte à l'ouverture, pas à la clôture.

**Anti-doublon** : `idempotencyKey` Resend (24h cross-instance, ex: `order-confirm-${orderId}`, `order-cancel:${orderId}`) + cache LRU in-process 10 min via `send-email.ts`. Pas de flag DB côté Order (KISS).

Config: `shared/lib/email-config.ts`. Preview: `pnpm email:dev`.

## Prisma Patterns

```typescript
import { notDeleted, softDelete } from "@/shared/lib/prisma";

// Exclude soft-deleted
await prisma.order.findMany({ where: { ...notDeleted } });

// Soft delete — un SEUL helper, `discount`
await softDelete.discount(discountId);
```

⚠️ `softDelete` n'expose plus qu'une entrée, et **n'en rajouter une que le jour où un appelant
existe**. Chaque module pose son `deletedAt` dans sa propre transaction, avec les écritures qui
l'accompagnent (purge des liaisons, audit, promotion d'un nouveau défaut) ; un helper mono-ligne
à côté ne fait que suggérer un raccourci qui sauterait ces étapes.

**Key enums**: `ProductStatus`, `OrderStatus`, `PaymentStatus`, `RefundStatus`

**Il n'y a plus de journal d'inventaire** (`StockMovement` supprimé : 7 écrivains, zéro lecteur).
Le registre obligatoire d'une micro-entreprise est le livre de recettes (export CSV filtré sur
`paidAt`, Art. 50-0 CGI), pas un journal de stock. Décrément et restock sont inchangés.
**Le rouvrir demanderait d'abord une surface de LECTURE** — c'est son absence qui l'a condamné.

### Migrations & rollback

Chaque nouvelle migration **doit** ajouter un `down.sql` paire dans le même dossier (`prisma/migrations/<timestamp>_<name>/down.sql`) pour permettre un rollback rapide en cas d'incident production. Exemple : `prisma/migrations/20260804200000_add_order_stripe_charge_id/down.sql`. (Les 21 migrations en ont une — c'est le contract test de parité qui l'exige, pas une convention molle.)

Pas de rétroactif sur les migrations existantes (risque trop élevé). En cas de besoin de rollback historique : restore Neon PITR.

#### Historique baseliné — `0_init` est la PREMIÈRE migration

`prisma/migrations/` part de `0_init`, qui reconstruit toute la base ; les migrations suivantes sont incrémentales et normales. Les migrations d'avant le baseline sont archivées dans `prisma/migrations-archive/` — documentation seulement, hors du chemin de Prisma. Contexte du baselining : [`RUNBOOK`](docs/RUNBOOK.md#-baselining-du-schéma--pourquoi-0_init-existe).

⚠️ **Ne JAMAIS éditer `0_init`.** Son checksum est enregistré dans `_prisma_migrations` sur toute base où il a été marqué appliqué : le modifier fait échouer `migrate deploy` (« migration was modified after it was applied »). Une évolution du schéma s'écrit **toujours** dans une nouvelle migration, jamais dans le baseline — y compris pour ajouter un garde brut.

**Structure de `0_init`** — deux parties, et la seconde est la plus importante :

1. DDL généré par `prisma migrate diff --from-empty --to-schema` (tables, colonnes, enums, FK, index normaux).
2. **Annexe des gardes bruts** — copie de `prisma/sql/raw-guards.sql` : 22 CHECK, 8 index partiels/expression, 2 extensions, 2 fonctions, 2 triggers. **`prisma migrate diff` n'en génère AUCUN.** Un baseline régénéré sans recoller cette annexe perdrait en silence le format de numéro de facture (Art. 286 CGI), le trigger d'unicité cross-table des avoirs, le CHECK singleton `StoreSettings`, la formule de total de commande…

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

Synclune est entrepreneur individuel **micro-entreprise franchise TVA** (Art. 293 B CGI). Les
montants des seuils et leurs conséquences vivent dans [`docs/BUSINESS.md`](docs/BUSINESS.md#seuils-fiscaux-à-surveiller-ssot--sharedconstantsvat-franchiseets) ;
le calendrier de la réforme et l'e-reporting à réécrire, dans [`docs/RUNBOOK.md`](docs/RUNBOOK.md).
Ce qui relève du **code** :

- Le seuil est piloté par `VAT_FRANCHISE_THRESHOLD_EUR` (SSOT `shared/constants/vat-franchise.ts`) ; le majoré en dérive × 1,1 via `getMajoredFranchiseThresholdCents()`.
- ⚠️ **Les deux seuils n'ont pas la même conséquence** — le base laisse la franchise acquise jusqu'au 31 décembre, le majoré rend la TVA due dès le 1ᵉʳ du mois de dépassement. Ne pas annoncer le second dès le premier (`vat-progress-card.regression.test.tsx`).
- La mention légale ne s'écrit **jamais en littéral** : PDF facture/avoir, checkout, CGV, mentions légales et email dérivent tous de `DEFAULT_FRANCHISE_VAT_MENTION` (`vat-mention-ssot.regression.test.ts`) — c'est ce qui rendra la bascule CGI → CIBS atomique.
- ⚠️ **L'e-reporting a été RETIRÉ du code** (dry-run intégral contre une spec non figée, sans Plateforme Agréée). **À réécrire au go-live**, pas à réactiver.

Les invariants ci-dessous gardent le code conforme aux Art. 286 / 289-I / 272-I CGI, L102 B LPF et L123-22 Code de Commerce.

### Invariants intangibles

1. **Aucune création manuelle de facture** depuis l'admin ou ailleurs. Toute facture (`invoiceNumber`) doit passer par `persist-invoice-number.service.ts`, déclenché uniquement par le webhook `payment_intent.succeeded` (eager via `ensure-invoice-number.service.ts`) ou en lazy fallback dans `app/api/orders/[orderNumber]/invoice/route.ts`. Aucune Server Action ne doit écrire `invoiceNumber` ou `creditNoteNumber`. Défense en profondeur (EINV-SEQ-008) : `persistInvoiceNumber` refuse en interne toute commande jamais encaissée (`paidAt` NULL **et** `paymentStatus ≠ PAID`) — Art. 289-I, la garde ne dépend plus des callers.
2. **Aucun avoir manuel.** `creditNoteNumber` (`A-YYYY-NNNNN`) est généré uniquement par `void-invoice.service.ts` (full void Order — appelé depuis `cancel-order`, `mark-as-fully-refunded` et le webhook `charge.refunded`) et `issue-credit-note.service.ts` (avoir partiel Refund), tous deux via la séquence SSOT `credit-note-sequence.service.ts`. Les écritures `Refund.creditNote*` sont verrouillées par leur propre assertion dans `no-manual-invoice-creation.regression.test.ts`.
3. **`OrderHistory` est immuable PENDANT la rétention 10 ans** — pas de `deletedAt`, pas d'`update`/`delete` applicatif (Art. L123-22). **Unique exception** : passée l'échéance, `hard-delete-retention` neutralise `note` + `metadata` (`ORDER_HISTORY_PII_SCRUB`) ; la ligne survit (action, statuts, dates, auteur staff). Allowlist fermée dans `order-history-immutability.regression.test.ts` — tout autre writer est une régression. Corollaire RGPD : un audit `source: CUSTOMER` ne doit JAMAIS dériver `authorName` du client — libellé neutre `"Client"`, `source` suffisant à qualifier l'origine, car la PII y survivrait toute la rétention (`order-history-no-customer-pii`). ⚠️ `OrderHistory.authorId` a disparu le 2026-08-05 (~35 écrivains, zéro lecteur) : l'auteur, c'est `authorName` + `source`.
4. **Snapshots OrderItem figés** au moment du checkout (`productTitle`, `productImageUrl`, `skuColor`, `skuMaterial`, `skuSize`, `price`). Une mutation Product/Sku ne doit jamais modifier un OrderItem existant.
5. **Snapshots adresses figés** sur Order au checkout : `shipping*` (+ `customer*`) copiés champ-à-champ depuis le formulaire dans la tx de création (`order-creation.service.ts`). **Il n'existe qu'UNE adresse par commande** — pas de colonnes `billing*`, et `buildBillingAddress` rend l'adresse de livraison, celle qu'imprime le PDF sous « Facturé à ». ⚠️ **Condition de réouverture** (Art. 242 nonies A ann. II CGI, et au plus tard l'émission structurée de sept. 2027 où la livraison est un bloc séparé BT-75→79) : il faudra capter l'adresse de l'acheteuse **au checkout** — surtout pas ré-ajouter des colonnes que rien ne remplit, ce qui était précisément le défaut des anciennes. Détail : [`docs/BUSINESS.md`](docs/BUSINESS.md#-conditions-de-réouverture--adresse-de-facturation-et-identité-vendeur).
   6bis. **Un avoir porte UNE ligne, au montant remboursé.** `RefundItem` est parti le 2026-08-05 : l'itemisation d'un remboursement était FABRIQUÉE — depuis le passage Stripe-first on rembourse un **montant**, jamais des articles, et l'allocation pro-rata gardait `quantity` = quantité commandée ENTIÈRE. La ligne imprimée affichait donc « 2 × 30,00 € » pour un total de « 20,00 € » : une ligne qui ne s'additionne pas, canonicalisée et figée sous SHA-256 pour dix ans. `buildCreditNoteLine` émet désormais une ligne unique « Remboursement sur facture F-YYYY-NNNNN » au montant `refund.amount` — l'Art. 272-I CGI demande la référence à la facture corrigée et le montant, pas le détail des articles. Verrouillé par une assertion d'arithmétique (`quantity × unitPrice === lineTotal`) dans `build-credit-note-data.regression.test.ts`.

6. **PDF immuable post-émission (factures ET avoirs)** : `archive-invoice-pdf.service.ts` upload UploadThing + SHA-256 (`Order.invoicePdfHash`). Les routes servent l'archive en priorité, la régénération n'est qu'un fallback. **Avoirs** : ils n'ont PAS de snapshot de données (contenu reconstruit depuis les colonnes Order), donc leur PDF est archivé **eagerly à l'émission**, rattrapé par `reconcile-invoices`. Tout rendu passe par les SSOT `render-order-credit-note.service.ts` / `render-refund-credit-note.service.ts` — sinon le PDF cesse d'être bit-identique au hash. ⚠️ **Si un chemin d'anonymisation d'utilisateur revient, il DOIT bloquer sur « avoir émis non archivé » avant son scrub** : cette garde a été retirée avec l'espace client, l'invariant ne tient plus que sur l'archivage eager (`credit-note-eager-archive.regression.test.ts`). **Le hash n'est JAMAIS réécrit** : la passe d'intégrité auto-répare une copie UploadThing corrompue uniquement si la régénération est bit-identique ; sinon alerte admin (cf. [`RUNBOOK`](docs/RUNBOOK.md#-intégrité-pdf-archivés-art-l102-b-lpf)).
7. **Numérotation séquentielle gap-free** : `F-YYYY-NNNNN` pour factures, `A-YYYY-NNNNN` pour avoirs. CHECK constraints DB strictes (`^F-[0-9]{4}-[0-9]{5}$`). Advisory locks Postgres `1_000_000+year` (facture) et `2_000_000+year` (avoir). Sérialisation totale par année. L'unicité cross-table des avoirs (Order ∪ Refund) est en plus verrouillée côté DB par le trigger `check_credit_note_cross_table_unique` (migration 20260709, rejette en 23505/P2002 les écritures contournant le lock). Les 3 tx de séquence utilisent `TX_TIMEOUT_LONG`/`TX_MAX_WAIT_LONG` (l'attente advisory lock compte dans le timeout) et retentent les codes transitoires `RETRYABLE_SEQUENCE_TX_ERROR_CODES` (P2002/P2024/P2028 — sûr car garde d'idempotence re-vérifiée sous lock).
8. **Pas de vente manuelle / pas de caisse.** Aucune Server Action ne doit créer une commande payée sans passer par Stripe (PaymentIntent). Tout flow alternatif (`recordCashSale`, `createManualOrder`, etc.) requiert validation comptable préalable — sinon risque "logiciel de caisse" NF 525 non conforme.
9. **Rétention PII vs RGPD.** Deux temps, et l'app n'en porte plus qu'un — l'anonymisation de COMPTE est partie avec l'espace client. **Règle qui survit, pour tout futur chemin d'anonymisation** : scrubber les surfaces _opérationnelles_ (`customer*`, `shipping*`) et **JAMAIS** l'identité légale de la facture (le PDF archivé), conservée au titre de l'exemption RGPD Art. 17(3)(b). Cette identité n'est purgée qu'à `paidAt + 10 ans` par `hard-delete-retention` (marqueur `Order.piiPurgedAt`) ; les commandes jamais payées, à 3 ans (`UNPAID_ORDER_PII_RETENTION_DAYS`). Périmètre exact : SSOT `modules/orders/constants/pii-scrub.ts`, verrouillé par `purge-pii-scrub-contract.regression.test.ts`. ⚠️ Corollaire : ne JAMAIS écrire de **valeurs** d'adresse client dans `OrderHistory.metadata` — `changedFields` uniquement, car la neutralisation n'arrive qu'à 10 ans.

10. **L'identité vendeur ne vit QUE dans le PDF archivé.** Il n'y a pas de colonnes `Order.vendor*` : `buildSellerInfo()` lit l'env, et son résultat est imprimé dans le PDF au moment de l'émission — puis archivé sur UploadThing avec son SHA-256 (`Order.invoicePdfHash`), re-vérifié à chaque téléchargement (EINV-PDF-006). L'Art. L102 B LPF tient par là, et **uniquement** par là depuis le retrait du snapshot de données (2026-08-05). ⚠️ **Trois corollaires non négociables** : (a) le PDF archivé fait foi, toujours ; (b) une régénération est un **dépannage** qui porte l'identité vendeur COURANTE et ne doit jamais être présentée comme l'original ; (c) l'archivage n'est donc pas optionnel — `reconcile-invoices` (seul cron monitoré Sentry) reprend toute facture numérotée sans `invoicePdfUrl`, prédicat **dérivé de l'état**, pas un drapeau. Rouvrir un snapshot de données exigerait d'y re-verser l'identité vendeur, dans la MÊME transaction que `invoiceNumber`.

11. **Une facture incohérente n'est jamais émise.** `persistInvoiceNumber` valide le payload par `invoiceDataSchema` (somme des lignes == totaux) **avant** d'écrire `invoiceNumber` ; un échec diffère la facture vers `reconcile-invoices` + alerte admin plutôt que de la laisser naître fausse. Cette garde comptait déjà quand le snapshot existait ; elle compte **davantage** depuis son retrait : le document n'est plus figé en base, mais il l'est dans le PDF archivé, dont le hash est scellé dix ans — une facture fausse serait archivée fausse. ⚠️ Il n'y a plus ni `formatVersion`, ni canonicalisation JSON, ni vérification de snapshot : `InvoiceData` est un payload **transitoire** (build → render), plus une pièce conservée. Le seul artefact conservé est le PDF.

### Tests régression dédiés

Chaque invariant ci-dessus nomme le test qui le verrouille. Deux gardes n'ont pas de site naturel
dans le texte : le **rollover silencieux au-delà de 99999/an** (sous-suite « overflow » de
`persist-invoice-number.service.test.ts`, invariant 7) et l'**unicité cross-table des numéros
d'avoir** vérifiée par le trigger DB (`credit-note-cross-table-unique.integration.test.ts`,
invariant 7 — c'est un test d'intégration, donc muet sans `INTEGRATION_DATABASE_URL`).

### Conformité réglementaire (référencement)

Chemins sans numéro de ligne, délibérément : les ancres `fichier:ligne` de cette table avaient
toutes dérivé (l'ancre Art. 293 B tombait sur un commentaire), et rien ne les gardait.
`test/contract/claude-md-accuracy.contract.test.ts` interdit désormais d'en réintroduire.

| Article                                    | Localisation                                                                             | Statut |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | ------ |
| Art. 286 CGI — séquentialité gap-free      | `modules/orders/services/persist-invoice-number.service.ts` + CHECK DB                   | ✓      |
| Art. 289-I CGI — émission à l'encaissement | `modules/orders/services/ensure-invoice-number.service.ts` (ORD-COMPLY-002)              | ✓      |
| Art. 272-I CGI — avoir post-facture        | `modules/orders/services/void-invoice.service.ts` (ORD-COMPLY-003)                       | ✓      |
| Art. 293 B CGI — mention franchise TVA     | `modules/invoices/services/render-invoice-pdf.ts` + SSOT `DEFAULT_FRANCHISE_VAT_MENTION` | ✓      |
| Art. L102 B LPF — immutabilité 10 ans      | `modules/orders/services/archive-invoice-pdf.service.ts` (ORD-COMPLY-005)                | ✓      |
| Art. L123-22 C. com. — audit trail         | `OrderHistory` + `createOrderAuditTx`                                                    | ✓      |
| Art. 50-0 CGI — CA à l'encaissement        | `modules/orders/services/export-orders-csv.service.ts`, filtre `paidAt` (ORD-COMPLY-007) | ✓      |

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

- **Rate limiting**: in-memory per-action via `shared/lib/rate-limit.ts` (**fixed counter window**, pas de sliding ; 100 req/min IP global + limites par action). IP extraction Vercel-first : `x-vercel-forwarded-for` → `x-real-ip` → `x-forwarded-for` (les deux premiers non-spoofables via l'edge). ⚠️ Chaque instance serverless a son propre Map, remis à zéro au cold-start : protection best-effort contre l'abus simple, **insuffisante contre un DDoS**. Cohérence cross-instance = Upstash ou Arcjet, non installés.

  **La clé est `ratelimit:<name>:<identifier>`, et `name` est REQUIS** (`RateLimitConfig.name`, SSOT dans `shared/lib/rate-limit-config.ts` + `modules/media/constants/upload-limits.ts` + `modules/products/constants/search.constants.ts`). Convention : identifiant du const sans `_LIMIT`, en kebab-case.

  **Pourquoi `name` n'est pas optionnel** : sans lui, la limite effective d'une action serait le **minimum** des limites de toutes celles partageant l'identifiant, avec la fenêtre de la première entrée créée. C'est ce qui laissait 5 consultations de fiche produit (30/min) faire répondre 429 au formulaire de connexion (5/15 min sur un `ip:` nu) — **verrouillant l'unique compte d'administration**. Le champ est donc requis par le type, sans repli silencieux. Deux appelants d'un **même** preset partagent toujours une entrée : correct, ils ont les mêmes `limit`/`windowMs` par construction. Verrouillé par `rate-limit-preset-naming.regression.test.ts`.

  Côté admin, les presets sont consolidés sur un preset **PARTAGÉ** unique `ADMIN_LIMIT` (`name: "admin"`, 120/min — partage par identité d'objet via les agrégats `ADMIN_*_LIMITS`) ; restent dédiés `admin-order-export`, `admin-maintenance`, `admin-search` et `admin-invoice-download`. Les presets publics/auth/checkout/webhook gardent leur granularité — les fondre dans le compteur admin rendrait leurs protections (brute force, énumération de codes, pics Stripe) décoratives.

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

| Scope               | Déclencheur                                                                                   | Commande                | Durée cible |
| ------------------- | --------------------------------------------------------------------------------------------- | ----------------------- | ----------- |
| **Critical path**   | Pre-commit (si modules touchés) + CI PR                                                       | `pnpm test:critical`    | < 10s       |
| **Full unit suite** | CI PR + push main                                                                             | `pnpm test:coverage`    | ~2 min      |
| **Integration DB**  | CI PR (job `tests-integration`, service Postgres) + opt-in local (`INTEGRATION_DATABASE_URL`) | `pnpm test:integration` | ~30s        |
| **Contract Stripe** | Inclus dans full unit suite                                                                   | (incluse)               | < 5s        |
| **E2E complet**     | CI PR + push main (sharded ×4)                                                                | `pnpm e2e`              | ~15 min     |

⚠️ **Il n'y a plus de job `e2e-smoke` en CI** — il refaisait build + seed + install Playwright (~10 min) pour rejouer ce que le job `e2e` couvre déjà. Les tags `@smoke` restent utiles **en local** (`pnpm e2e --grep @smoke`). Corollaire : `e2e-smoke` ne doit pas figurer dans les required status checks GitHub — un check requis que plus aucun job ne rapporte **bloque toutes les PR**.

### Critical path (7 modules)

Les modules `cart`, `orders`, `payments`, `webhooks`, `auth`, `refunds`, `invoices` sont les flows transactionnels revenus/sécurité (le module `invoices` porte la numérotation séquentielle gap-free et l'archivage PDF immuable — toute régression y est un risque réglementaire). Leurs tests s'exécutent :

- **Pre-commit local** (hook husky) : uniquement si `git diff --cached` contient un fichier sous ces modules — commit instantané sinon.
- **CI** : job `tests-critical` dédié en parallèle de `quality` pour feedback rapide.

### Ajouter une suite au critical path

1. Étendre le glob du script `test:critical` dans `package.json`.
2. Étendre le regex du hook `.husky/pre-commit`.
3. Mettre à jour cette section.

### Conventions de tests

- Fichiers : `<nom>.test.ts(x)` à côté du code ou dans `__tests__/`.
- **Régression locked** : suffixe `<sujet>.regression.test.ts(x)` + JSDoc `@regression <slug>` en tête. Convention : un test régression verrouille une correction de bug précise — toute modif requiert review explicite. Inventaire vivant via `grep -rn "@regression" --include="*.test.ts*"`. Exemples : `webhook-concurrency.regression.test.ts` (P2002 race), `link-history-back.regression.test.tsx` (un `<DrawerClose>` autour d'un `<Link>` annule la navigation).
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

⚠️ Les libellés de rate limit (« Trop de tentatives. Veuillez réessayer plus tard. ») sont encore vouvoyants dans plusieurs fichiers (`payments`) — dette connue, à traiter en une passe transverse, pas fichier par fichier. Cf. [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md).

## Constats connus, non corrigés

[`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md) recense les défauts reproduits et localisés qu'on a **délibérément** laissés en place parce qu'ils demandent une conception à part entière. Les entrées qui ont un point d'ancrage dans le code sont doublées d'un commentaire `@see docs/KNOWN-ISSUES.md` à ce site (KI-002, KI-004) ; celles qui décrivent une dette diffuse n'en ont pas (KI-003, libellés de rate limit vouvoyants sur ~20 fichiers ; KI-005, double SSOT du numéro d'avoir). À lire avant de retravailler la resoumission de checkout (KI-001) ou la persistance du formulaire de paiement (KI-002) — pas pour les découvrir une seconde fois.
