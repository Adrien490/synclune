# Mobile List Card UI/UX — Design Guide 2026

Documentation des patterns UI/UX modernes pour une card dans une liste mobile, avec un rendu natif premium (iOS/Android 2026). Applicable aux listes admin et storefront de Synclune.

---

## 1. Stack Mapping — Composants & Hooks existants

Avant d'implementer, utiliser les primitives existantes du projet :

### Composants UI

| Primitive                                                                     | Fichier                             | Usage                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ItemGroup` / `Item`                                                          | `shared/components/ui/item.tsx`     | **Primitive liste principale** — `ItemGroup` fournit `role="list"`, `Item` fournit layout flex, variantes (default/outline/muted), tailles (default/sm) |
| `ItemMedia` / `ItemContent` / `ItemTitle` / `ItemDescription` / `ItemActions` | `shared/components/ui/item.tsx`     | Sous-composants de `Item` pour structurer le contenu                                                                                                    |
| `Card` (interactive)                                                          | `shared/components/ui/card.tsx`     | Card avec `@container/card`, prop `interactive` pour hover/focus states                                                                                 |
| `Skeleton` / `SkeletonGroup` / `SkeletonText`                                 | `shared/components/ui/skeleton.tsx` | Variants `default` (pulse) / `shimmer`, shapes (`rectangle` / `rounded` / `circle` / `text`), `SkeletonGroup` fournit `role="status" aria-busy="true"`  |
| `Badge`                                                                       | `shared/components/ui/badge.tsx`    | Badges statut avec variantes semantiques                                                                                                                |

### Composants Animation

| Composant     | Fichier                                         | Usage                                                                                    |
| ------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `StaggerGrid` | `shared/components/animations/stagger-grid.tsx` | Stagger entree pour grilles (produits, collections) — respecte `prefers-reduced-motion`  |
| `Stagger`     | `shared/components/animations/stagger.tsx`      | Stagger entree pour listes verticales — prop `role="list"` passthrough, `disableOnTouch` |
| `Fade`        | `shared/components/animations/fade.tsx`         | Fade-in simple avec Y offset — `disableOnTouch`, `inView`                                |

### Hooks

| Hook                 | Fichier                            | Usage                                                      |
| -------------------- | ---------------------------------- | ---------------------------------------------------------- |
| `useIsMobile()`      | `shared/hooks/use-mobile.ts`       | Breakpoint 768px, SSR-safe (`useSyncExternalStore`)        |
| `useIsTouchDevice()` | `shared/hooks/use-touch-device.ts` | Detecte `(hover: none) and (pointer: coarse)`              |
| `useEdgeSwipe()`     | `shared/hooks/use-edge-swipe.ts`   | Swipe from left edge (20px), seuil 50px, passive listeners |
| `usePinchZoom()`     | `shared/hooks/use-pinch-zoom.ts`   | Pinch-to-zoom, double-tap, pan, keyboard support           |

### CSS Custom Variants

```css
/* Conditionner les hover states au pointer fine (pas de hover fantome sur mobile) */
@custom-variant can-hover (@media (hover: hover) and (pointer: fine));
```

Usage : `can-hover:bg-accent/50`, `can-hover:scale-105`

### Utilitaires CSS existants (`app/styles/utilities.css`)

- `.fixed-bottom-safe` / `.pb-safe` — PWA safe-area
- `.min-h-svh` / `.h-lvh` — Viewport units
- `.scroll-snap-x` / `.snap-start` / `.snap-center` — Scroll snap pour listes horizontales
- `.content-defer` — `content-visibility: auto` pour listes longues

---

## 2. Anatomie d'une card liste mobile native

```
┌─────────────────────────────────────────────┐
│  ┌──────┐                                   │
│  │      │  Titre principal          ● badge  │
│  │ img  │  Sous-titre / metadata             │
│  │ 48px │  Info tertiaire        chevron ›   │
│  └──────┘                                   │
│─────────────────────────────────────────────│
│  ┌──────┐                                   │
│  │      │  Titre principal          ● badge  │
│  │ img  │  Sous-titre / metadata             │
│  │      │  Info tertiaire        chevron ›   │
│  └──────┘                                   │
└─────────────────────────────────────────────┘
```

### Zones d'information (3 niveaux max)

| Zone          | Contenu                                      | Composant existant                     | Style                                       |
| ------------- | -------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| **Leading**   | Thumbnail (48-56px), avatar, icone, checkbox | `ItemMedia` (variant `image` / `icon`) | `rounded-lg` (8px)                          |
| **Primary**   | Titre (1 ligne, truncate)                    | `ItemTitle`                            | `font-medium text-sm` / `text-base`         |
| **Secondary** | Sous-titre, date, statut                     | `ItemDescription`                      | `text-muted-foreground text-xs` / `text-sm` |
| **Tertiary**  | Prix, quantite, info contextuelle            | Libre dans `ItemContent`               | `text-xs text-primary`                      |
| **Trailing**  | Badge, chevron, action rapide                | `ItemActions`                          | Aligne a droite                             |

---

## 3. Principes natifs 2026

### 3.1 Espacement & Touch targets

- **Hauteur minimum** : 64px (ideal 72-88px pour contenu riche)
- **Touch target** : 44x44px minimum (WCAG 2.5.8 Target Size)
- **Padding** : `p-4` (16px) par defaut, `py-3 px-4` en variant `sm` — aligne avec `Item` existant
- **Gap entre items** : 0px (separateur) ou `gap-2` (8px, cards espacees)
- **Thumb zone** : Actions frequentes dans la zone basse (< 60% ecran)
- **Container padding** : `px-4 sm:px-6 lg:px-8` (aligne avec `CONTAINER_PADDING`)

### 3.2 Feedback tactile

- **Press state** : `bg-muted/50` transition 100ms — utiliser `can-hover:bg-accent/50` pour le hover, `:active` pour le press sur mobile
- **Active scale** : `active:scale-[0.98]` subtil sur press (150ms ease-out) — `MOTION_CONFIG.duration.fast`
- **No hover states sur mobile** : Utiliser `@custom-variant can-hover` exclusivement, pas de `:hover` nu
- **Haptic feedback** : Android Chrome uniquement (`navigator.vibrate()`), non disponible sur iOS Safari — utiliser avec parcimonie :

```tsx
function triggerHaptic(duration = 10) {
	if (typeof navigator !== "undefined" && "vibrate" in navigator) {
		navigator.vibrate(duration);
	}
}
```

### 3.3 Separateurs

- **Recommande** : Pas de separateur visible — utiliser l'espacement (`gap`) et le fond (`bg-card` vs `bg-background`)
- **Si necessaire** : `ItemSeparator` (composant existant) — `Separator` inset aligne apres le leading
- **Cards separees** : Utiliser `gap-2` ou `gap-3` entre les cards, pas de separateur

---

## 4. Patterns d'interaction

### 4.1 Swipe Actions (pattern critique)

```
← Swipe gauche                    Swipe droite →
┌────────────┬───────────────────┬────────────┐
│  Supprimer │    Card content   │  Archiver  │
│    (rouge) │                   │   (bleu)   │
└────────────┴───────────────────┴────────────┘
```

- **Seuil de declenchement** : 80px ou 30% de la largeur
- **Overswipe** : Action auto-declenchee a >75% de la largeur
- **Retour elastique** : `MOTION_CONFIG.spring.list` (stiffness 400, damping 30)
- **Max 2 actions par cote** (1 ideal)
- **Couleurs semantiques** : `bg-destructive` = supprimer, `bg-secondary` = archiver, `bg-success` = valider
- **Accessibilite obligatoire** : Chaque action swipe **doit** avoir un equivalent via long press menu ou bouton visible

### 4.2 Long Press → Context Menu

- **Delai** : 500ms
- **Feedback** : `scale(1.02)` + `backdrop-blur-sm` sur le fond
- **Menu** : Sheet en bottom (utiliser le sheet existant du projet)
- **Backdrop** : `backdrop-blur-sm` + overlay `bg-black/40`

### 4.3 Pull to Refresh

- Indicateur spinner en haut de la liste
- Seuil : 80px de pull
- Animation : `MOTION_CONFIG.spring.gentle` pour le return
- **Critique** : Ajouter `overscroll-behavior-y: contain` sur le conteneur scrollable pour empecher le pull-to-refresh natif du navigateur de prendre le dessus

```css
.pull-to-refresh-container {
	overscroll-behavior-y: contain;
	overflow-y: auto;
}
```

```tsx
"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Loader2 } from "lucide-react";

const PULL_THRESHOLD = 80;

function PullToRefresh({
	onRefresh,
	children,
}: {
	onRefresh: () => Promise<void>;
	children: React.ReactNode;
}) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const y = useMotionValue(0);
	const spinnerOpacity = useTransform(y, [0, PULL_THRESHOLD], [0, 1]);
	const spinnerScale = useTransform(y, [0, PULL_THRESHOLD], [0.5, 1]);

	async function handleDragEnd() {
		if (y.get() >= PULL_THRESHOLD && !isRefreshing) {
			setIsRefreshing(true);
			try {
				await onRefresh();
			} catch {
				// Feedback d'erreur (toast, inline message, etc.)
			} finally {
				setIsRefreshing(false);
			}
		}
	}

	return (
		<div ref={containerRef} className="relative overflow-y-auto [overscroll-behavior-y:contain]">
			<motion.div
				className="flex items-center justify-center py-4"
				style={{ opacity: spinnerOpacity, scale: spinnerScale }}
			>
				<Loader2 className="text-muted-foreground size-5 animate-spin" />
			</motion.div>
			<motion.div
				drag="y"
				dragConstraints={{ top: 0, bottom: PULL_THRESHOLD }}
				dragElastic={0.4}
				onDragEnd={handleDragEnd}
				style={{ y }}
				transition={MOTION_CONFIG.spring.gentle}
			>
				{children}
			</motion.div>
		</div>
	);
}
```

### 4.4 Tap → Navigation

- Toute la card est tappable (pas juste le texte) — utiliser `Item asChild` avec `<Link>`
- Chevron `›` en trailing indique la navigation
- Transition : View Transition API si disponible (voir section 11), sinon slide 300ms ease

### 4.5 Drag & Drop / Reorder

Le projet utilise dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`). Pattern existant :

- **DragOverlay** : `shadow-lg` + `scale(1.02)` sur l'item en cours de drag
- **Grip handle** : Icone grip visible en leading, `cursor-grab` / `cursor-grabbing`
- **Triple sensor** : Pointer + Keyboard + Touch sensor
- **Reduced motion** : Animation reorder desactivee
- **Duree reorder** : `MOTION_CONFIG.duration.normal` (200ms)

---

## 5. Etats visuels

### 5.1 Loading (Skeleton)

```
┌─────────────────────────────────────────────┐
│  ┌──────┐  ████████████████                 │
│  │ ░░░░ │  ██████████                       │
│  │ ░░░░ │  ████████                         │
│  └──────┘                                   │
└─────────────────────────────────────────────┘
```

Utiliser les composants existants :

```tsx
<SkeletonGroup label="Chargement de la liste">
	{Array.from({ length: 4 }).map((_, i) => (
		<Item key={i} size="sm">
			<Skeleton shape="rounded" className="size-12 shrink-0" />
			<ItemContent>
				<Skeleton shape="text" className="h-4 w-3/4" />
				<Skeleton shape="text" className="h-3 w-1/2" />
			</ItemContent>
		</Item>
	))}
</SkeletonGroup>
```

- Variant `shimmer` par defaut (animation 1.5s ease-in-out infinie)
- `SkeletonGroup` fournit `role="status" aria-busy="true"` + `sr-only` label
- Staggered `animationDelay` : `i * 100ms` pour effet de vague
- Memes dimensions que le contenu reel (pas de layout shift)
- 3-5 items skeleton visibles

### 5.2 Empty State

- Illustration centree (icone ou SVG leger)
- Titre + description + CTA
- Pas de liste vide sans explication
- Utiliser `TableEmptyState` existant pour les DataTables admin

### 5.3 Error State

- Message inline dans la liste
- Bouton "Reessayer"
- Pas de page d'erreur plein ecran pour une erreur de fetch
- **Error boundary par item** : Un item en erreur ne doit pas crasher toute la liste. Wrapper chaque item avec un error boundary leger. Utiliser le package `react-error-boundary` (a installer si necessaire) :

```tsx
import { ErrorBoundary } from "react-error-boundary";

function ListWithItemRecovery({ items }: { items: Item[] }) {
	return (
		<ItemGroup aria-label="Liste des commandes">
			{items.map((item) => (
				<ErrorBoundary
					key={item.id}
					fallback={
						<Item variant="muted" className="opacity-60">
							<ItemContent>
								<ItemTitle>Impossible de charger cet element</ItemTitle>
								<ItemDescription>Erreur d'affichage</ItemDescription>
							</ItemContent>
						</Item>
					}
				>
					<ListItem item={item} />
				</ErrorBoundary>
			))}
		</ItemGroup>
	);
}
```

### 5.4 Selected (multi-selection)

- Checkbox animee en leading (remplace le thumbnail)
- Background teinte `bg-primary/5`
- Toolbar fixe en bas avec actions groupees (utiliser `.fixed-bottom-safe` pour PWA)
- Compteur "X selectionne(s)" avec `aria-live="polite"`

### 5.5 Offline (PWA) — recommandations

Le projet est une PWA (Serwist) avec page offline. Les patterns ci-dessous sont des recommandations pour les futures listes offline-aware :

- Items caches affiches normalement (service worker cache)
- Items non caches : skeleton avec message "Hors connexion"
- Actions de mutation desactivees avec tooltip explicatif
- Detecter l'etat reseau via `navigator.onLine` + events `online`/`offline`

---

## 6. Design tokens — Aligne avec le projet

### Typographie

| Element    | Classe Tailwind                        | Poids               | Line-height            |
| ---------- | -------------------------------------- | ------------------- | ---------------------- |
| Titre      | `text-sm` (14px) ou `text-base` (16px) | `font-medium` (500) | `leading-snug` (1.375) |
| Sous-titre | `text-xs` (12px) ou `text-sm` (14px)   | `font-normal` (400) | `leading-normal` (1.5) |
| Tertiaire  | `text-xs` (12px)                       | `font-normal` (400) | `leading-snug`         |
| Badge      | `text-xs` (12px)                       | `font-medium` (500) | `leading-none` (1)     |

### Couleurs

| Usage            | Token                                | Dark mode                        |
| ---------------- | ------------------------------------ | -------------------------------- |
| Fond card        | `bg-card`                            | `oklch(1 0 0)` → token dark auto |
| Fond presse      | `bg-muted/50`                        | Opacite preservee                |
| Fond selectionne | `bg-primary/5`                       | Opacite preservee                |
| Titre            | `text-foreground`                    | Auto-inverse                     |
| Sous-titre       | `text-muted-foreground`              | WCAG AAA (ratio 4.5:1+)          |
| Prix / accent    | `text-primary`                       | Rose fonce                       |
| Prix barre       | `text-muted-foreground line-through` | —                                |
| Prix promo       | `text-destructive font-medium`       | —                                |
| Destructif       | `text-destructive`                   | —                                |
| En stock         | `text-success`                       | —                                |
| Stock faible     | `text-warning`                       | —                                |
| Rupture          | `text-destructive`                   | —                                |

### Ombres & Bordures

| Usage                | Classe                                 | Variable CSS  |
| -------------------- | -------------------------------------- | ------------- |
| Cards separees       | `shadow-sm` ou `ring-1 ring-border/50` | `--shadow-sm` |
| Cards continues      | Pas d'ombre, separateur inset          | —             |
| Cards elevees (drag) | `shadow-lg` + `scale(1.02)`            | `--shadow-lg` |
| Overlays             | `shadow-xl`                            | `--shadow-xl` |

### Border-radius (aligne avec la scale du projet)

| Usage          | Classe         | Valeur                       |
| -------------- | -------------- | ---------------------------- |
| Thumbnails     | `rounded-lg`   | `--radius-lg` = 16px         |
| Cards separees | `rounded-xl`   | 24px (comme `Card` existant) |
| Badges         | `rounded-md`   | `--radius-md` = 10px         |
| Liste continue | `rounded-none` | 0                            |

### Badges & Tags inline

| Type              | Style                                                     |
| ----------------- | --------------------------------------------------------- |
| Statut commande   | `Badge` variant semantique + icone (pas de couleur seule) |
| Stock faible      | `text-warning text-xs` + icone warning                    |
| Promo / reduction | `Badge variant="secondary"` avec pourcentage              |
| Nouveau           | `Badge variant="default"` (primary)                       |

---

## 7. Animations & Transitions

Toutes les animations utilisent `MOTION_CONFIG` (`shared/components/animations/motion.config.ts`) :

| Animation        | Config                                                | Usage                 |
| ---------------- | ----------------------------------------------------- | --------------------- |
| Press feedback   | `duration.fast` (150ms) + ease-out                    | Fond + scale          |
| Swipe reveal     | `spring.list` (stiffness 400, damping 30)             | Actions swipe         |
| Item enter       | `duration.normal` (200ms) + `easing.easeOut`          | Apparition dans liste |
| Item exit        | `duration.fast` (150ms) + `easing.easeIn`             | Suppression           |
| Reorder          | `duration.normal` (200ms) + `easing.easeInOut`        | Drag & drop           |
| Skeleton shimmer | 1.5s ease-in-out (CSS)                                | Chargement            |
| Long press scale | `spring.gentle` (damping 25, stiffness 120, mass 0.8) | Context menu          |
| Expand/collapse  | `duration.collapse` (280ms) + `easing.collapse`       | Expandable cards      |

### Staggered entry (liste)

Utiliser `StaggerGrid` ou `Stagger` :

```tsx
<Stagger role="list" aria-label="Liste des commandes" stagger={0.06} y={20}>
	{orders.map((order) => (
		<div key={order.id} role="listitem">
			<OrderCard order={order} />
		</div>
	))}
</Stagger>
```

- Delai entre items : `MOTION_CONFIG.stagger.normal` (60ms) — defaut de `StaggerGrid`
- Max items animes : 8 (au-dela, apparition instantanee)
- `will-change: transform, opacity` pendant l'animation uniquement (gere par Motion)
- `prefers-reduced-motion` : Animation desactivee automatiquement par `Stagger` / `StaggerGrid`

### Scroll-driven animations

Le projet a 6 scroll-driven animations CSS. Pour les listes :

- **Reveal on scroll** : Items apparaissent progressivement au scroll (utiliser `Stagger` avec `inView`)
- **Parallax subtil** : Thumbnail avec leger decalage Y au scroll (CSS `animation-timeline: scroll()`)
- **Progress indicator** : Barre de progression en haut liee au scroll position

---

## 8. Variantes de layout

### 8.1 Compact (listes longues, admin)

- Hauteur : 56-64px
- Thumbnail : `size-10` (40px) — `ItemMedia variant="image"`
- 2 lignes de texte max
- `Item size="sm"` (py-3 px-4 gap-2.5)
- Usage : DataTables admin, listes de selection

### 8.2 Standard (storefront, commandes)

- Hauteur : 72-88px
- Thumbnail : `size-12` (48px) a `size-14` (56px)
- 3 lignes de texte
- `Item size="default"` (p-4 gap-4)
- Usage : liste commandes, liste adresses, panier

### 8.3 Rich (produits, contenu)

- Hauteur : 96-120px
- Thumbnail : `size-16` (64px) a `size-20` (80px)
- 3 lignes + tags/badges
- Possible action inline (bouton ajout panier) — 1 max visible
- Support thumbnail video (`<video autoPlay muted loop playsInline>`)
- Usage : produits, personnalisations, recommandations

### 8.4 Expandable (details inline)

- Tap pour expand/collapse
- Contenu additionnel avec `MOTION_CONFIG.duration.collapse` (280ms) height animation
- Chevron rotation 90deg → indicateur expand
- `aria-expanded` obligatoire sur le trigger

---

## 9. Responsive & Container Queries

### Breakpoints du projet

| Breakpoint | Valeur | Usage liste                 |
| ---------- | ------ | --------------------------- |
| `xs`       | 375px  | iPhone SE — layout minimal  |
| `sm`       | 640px  | Phablets — padding augmente |
| `md`       | 768px  | Tablettes — grilles 2 cols  |
| `lg`       | 1024px | Desktop — grilles 3+ cols   |

### Container Queries

Le composant `Card` existant utilise `@container/card`. Utiliser pour adapter le contenu d'une card selon sa propre largeur (pas le viewport) :

```css
/* Card dans sidebar etroite vs pleine largeur */
@container card (min-width: 300px) {
	[data-slot="item-actions"] {
		display: flex;
	}
}
@container card (max-width: 299px) {
	[data-slot="item-actions"] {
		display: none;
	}
}
```

### Adaptation mobile (Container Queries)

Les variations selon la largeur de la card sont gerees via **Container Queries** (`@container/card`), pas via media queries viewport. Cela permet aux cards de s'adapter dans n'importe quel contexte (pleine largeur, sidebar, split view).

| Element          | < 340px (SE, sidebar)      | 340-400px (standard) | > 400px (Pro Max, pleine largeur) |
| ---------------- | -------------------------- | -------------------- | --------------------------------- |
| Thumbnail        | `size-10` (40px)           | `size-12` (48px)     | `size-14` (56px)                  |
| Titre            | `text-sm` truncate 1 ligne | `text-sm`            | `text-base`                       |
| Actions trailing | Icone seule                | Icone seule          | Icone + label                     |
| Padding          | `px-4`                     | `px-4`               | `px-4`                            |

Implementation :

```css
@container card (max-width: 339px) {
	[data-slot="item-media"][data-variant="image"] {
		width: 2.5rem;
		height: 2.5rem;
	}
}
@container card (min-width: 340px) {
	[data-slot="item-media"][data-variant="image"] {
		width: 3rem;
		height: 3rem;
	}
}
@container card (min-width: 400px) {
	[data-slot="item-media"][data-variant="image"] {
		width: 3.5rem;
		height: 3.5rem;
	}
	[data-slot="item-title"] {
		font-size: var(--text-base);
	}
}
```

### Grilles existantes

| Contexte          | Mobile         | Tablet         | Desktop        | 2xl    |
| ----------------- | -------------- | -------------- | -------------- | ------ |
| Produits          | 2 cols `gap-4` | 3 cols `gap-6` | 4 cols `gap-8` | 5 cols |
| Adresses          | 1 col          | 2 cols         | 3 cols         | —      |
| Commandes         | 1 col          | 1 col          | 1 col          | —      |
| Personnalisations | 1 col          | 2 cols         | 2 cols         | —      |

---

## 10. Domain Patterns — Cards e-commerce Synclune

### 10.1 Product Card (storefront)

Pattern existant dans `modules/products/components/product-card.tsx` :

```
┌─────────────────────┐
│  ┌─────────────────┐ │
│  │                 │ │ ← Image aspect-3/4, hover scale(1.08)
│  │     Image       │ │ ← 2eme image fade overlay au hover
│  │                 │ │ ← Badge "Nouveau" / "-20%" (z-20)
│  │   ♡ 🛒         │ │ ← WishlistButton + AddToCart (z-30)
│  └─────────────────┘ │
│  Nom du bijou        │ ← text-sm font-medium, truncate 1 ligne
│  ● ● ● ●            │ ← Color swatches (pastilles cliquables)
│  89,00 €             │ ← text-primary font-medium
└─────────────────────┘
```

- Touch : Toute la card est un lien (z-10), boutons au-dessus (z-30)
- Mobile : Bouton ajout panier pleine largeur en bas
- Color swatches : `aria-label` avec nom de la couleur

### 10.2 Order Card (compte client)

```
┌─────────────────────────────────────────┐
│  #SYN-2024-0042    ● En preparation     │ ← Numero + Badge statut
│  23 mars 2026      2 articles           │ ← Date + compteur items
│  89,00 €                        ›       │ ← Montant + chevron nav
└─────────────────────────────────────────┘
```

- Badge statut : Couleur semantique + icone (jamais couleur seule)
- Statuts : `PENDING` (warning), `PROCESSING` (secondary), `SHIPPED` (secondary), `DELIVERED` (success), `CANCELLED` (destructive)

### 10.3 Cart Item (panier sheet)

Pattern existant dans `modules/cart/components/cart-sheet-item-row.tsx` :

```
┌──────┬──────────────────────────────┐
│      │  Nom du bijou       ✕       │ ← Titre + bouton supprimer
│ img  │  Or rose · Taille M         │ ← Variante (couleur + attributs)
│ 80px │  89,00 €       [- 1 +]     │ ← Prix + quantite stepper
└──────┴──────────────────────────────┘
```

- Grid `grid-cols-[5rem_1fr]` (sm: `6rem`)
- Image row-span 2
- Support video thumbnail (`autoPlay muted loop playsInline`)
- Etat pending : `opacity-50` pendant la mutation (optimistic UI)

### 10.4 Admin List Item (compact)

```
┌─────────────────────────────────────────────────┐
│  ☐  ┌────┐  Bague Celeste    ● Publie   ···   │
│     │ img│  REF-0042 · Or    89,00 €           │
│     └────┘                                      │
└─────────────────────────────────────────────────┘
```

- Checkbox en leading pour bulk selection
- Thumbnail `size-10` (40px)
- Badge statut produit : `DRAFT` / `ACTIVE` / `ARCHIVED`
- Menu actions `···` en trailing (edit, duplicate, archive, delete)
- `Item size="sm"` pour densite

### 10.5 Template TSX — Order Card complet

Exemple copier-coller d'une card commande mobile :

```tsx
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/shared/components/ui/item";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

const STATUS_VARIANT = {
	PENDING: "warning",
	PROCESSING: "secondary",
	SHIPPED: "secondary",
	DELIVERED: "success",
	CANCELLED: "destructive",
} as const;

function OrderCard({ order }: { order: Order }) {
	return (
		<Item asChild variant="outline" aria-roledescription="carte commande">
			<Link
				href={`/compte/commandes/${order.id}`}
				aria-label={`Voir la commande ${order.orderNumber}`}
			>
				<ItemContent>
					<ItemTitle>
						{order.orderNumber}
						<Badge variant={STATUS_VARIANT[order.status]}>{order.statusLabel}</Badge>
					</ItemTitle>
					<p className="text-muted-foreground text-xs">
						{order.formattedDate} · {order.itemCount} {order.itemCount > 1 ? "articles" : "article"}
					</p>
					<p className="text-sm font-medium">{order.formattedTotal}</p>
				</ItemContent>
				<ItemActions>
					<ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
				</ItemActions>
			</Link>
		</Item>
	);
}
```

### 10.6 Implementation Swipe Actions

Approche recommandee avec `motion/react` drag :

```tsx
"use client";

import { useRef } from "react";
import { type PanInfo, motion, useMotionValue, useTransform } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

const SWIPE_THRESHOLD = 80;
const OVERSWIPE_THRESHOLD_RATIO = 0.75;

function SwipeableCard({
	children,
	onDelete,
	deleteLabel = "Supprimer",
}: {
	children: React.ReactNode;
	onDelete: () => void;
	deleteLabel?: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const x = useMotionValue(0);
	const actionOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

	async function handleDragEnd(_: unknown, info: PanInfo) {
		const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 0;
		if (
			containerWidth > 0 &&
			Math.abs(info.offset.x) > containerWidth * OVERSWIPE_THRESHOLD_RATIO
		) {
			try {
				await onDelete(); // Overswipe — action auto-declenchee
			} catch {
				// Reset position + feedback d'erreur
				x.set(0);
			}
		}
	}

	return (
		<div ref={containerRef} className="relative overflow-hidden">
			{/* Action background visible au swipe */}
			<motion.div
				className="bg-destructive absolute inset-y-0 left-0 flex items-center px-6"
				style={{ opacity: actionOpacity }}
				aria-hidden="true"
			>
				<span className="text-destructive-foreground text-sm font-medium">{deleteLabel}</span>
			</motion.div>

			{/* Card draggable */}
			<motion.div
				drag="x"
				dragConstraints={{ left: -200, right: 0 }}
				dragElastic={0.1}
				onDragEnd={handleDragEnd}
				style={{ x }}
				transition={MOTION_CONFIG.spring.list}
				className="bg-card relative"
			>
				{children}
			</motion.div>
		</div>
	);
}
```

### 10.7 Implementation Long Press

Hook robuste — cancel au scroll, prevention du click parasite, feedback visuel :

```tsx
import { useRef, useState } from "react";

const LONG_PRESS_DELAY = 500;
const MOVE_TOLERANCE = 10; // px — au-dela, on considere que c'est un scroll

function useLongPress(onLongPress: () => void) {
	const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
	const startPosRef = useRef<{ x: number; y: number }>(null);
	const didLongPressRef = useRef(false);
	const [isPressing, setIsPressing] = useState(false);

	function clear() {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = null;
		setIsPressing(false);
	}

	function handleTouchStart(e: React.TouchEvent) {
		const touch = e.touches[0];
		if (!touch) return;
		startPosRef.current = { x: touch.clientX, y: touch.clientY };
		didLongPressRef.current = false;
		setIsPressing(true);

		timerRef.current = setTimeout(() => {
			didLongPressRef.current = true;
			setIsPressing(false);
			onLongPress();
		}, LONG_PRESS_DELAY);
	}

	function handleTouchMove(e: React.TouchEvent) {
		if (!startPosRef.current || !timerRef.current) return;
		const touch = e.touches[0];
		if (!touch) return;
		const dx = Math.abs(touch.clientX - startPosRef.current.x);
		const dy = Math.abs(touch.clientY - startPosRef.current.y);
		if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
			clear(); // L'utilisateur scroll — annuler le long press
		}
	}

	function handleTouchEnd() {
		clear();
	}

	function handleClick(e: React.MouseEvent) {
		// Empecher le click si un long press vient de se declencher
		if (didLongPressRef.current) {
			e.preventDefault();
			e.stopPropagation();
			didLongPressRef.current = false;
		}
	}

	return {
		onTouchStart: handleTouchStart,
		onTouchMove: handleTouchMove,
		onTouchEnd: handleTouchEnd,
		onTouchCancel: handleTouchEnd,
		onClick: handleClick,
		/** true pendant le delai avant declenchement — utiliser pour feedback visuel (scale, bg) */
		isPressing,
	};
}
```

Usage avec feedback visuel :

```tsx
function LongPressableCard({
	children,
	onContextMenu,
}: {
	children: React.ReactNode;
	onContextMenu: () => void;
}) {
	const { isPressing, ...longPressHandlers } = useLongPress(onContextMenu);

	return (
		<div
			{...longPressHandlers}
			className={cn("transition-transform duration-150", isPressing && "scale-[1.02]")}
		>
			{children}
		</div>
	);
}
```

---

## 11. Patterns modernes 2026

### View Transitions API

Pour les transitions list → detail (ex: tap produit → fiche produit) :

> **Note** : Pattern futur — non encore utilise dans Synclune. A evaluer quand l'API sera stable.

```tsx
// Next.js 16 supporte unstable_ViewTransition (API experimentale)
import { unstable_ViewTransition as ViewTransition } from "react";

<ViewTransition name={`product-${product.id}`}>
	<ProductCard product={product} />
</ViewTransition>;
```

- Transition partagee sur le thumbnail (morphing fluide)
- Fallback CSS pour navigateurs sans support :

```css
/* Fallback slide pour navigateurs sans View Transitions */
@supports not (view-transition-name: none) {
	[data-slot="page-enter"] {
		animation: slide-in-right 300ms ease forwards;
	}
	[data-slot="page-exit"] {
		animation: slide-out-left 300ms ease forwards;
	}
}

@keyframes slide-in-right {
	from {
		transform: translateX(100%);
		opacity: 0;
	}
	to {
		transform: translateX(0);
		opacity: 1;
	}
}
@keyframes slide-out-left {
	from {
		transform: translateX(0);
		opacity: 1;
	}
	to {
		transform: translateX(-30%);
		opacity: 0;
	}
}
```

### Container Queries

Deja en place sur `Card` (`@container/card`). Utiliser pour :

- Masquer les actions secondaires dans les cards etroites
- Adapter la taille du thumbnail au conteneur
- Switch layout horizontal ↔ vertical selon l'espace

### Scroll Snap (listes horizontales)

```tsx
<div className="scroll-snap-x flex gap-4 overflow-x-auto px-4">
	{products.map((product) => (
		<div key={product.id} className="w-[280px] shrink-0 snap-start">
			<ProductCard product={product} />
		</div>
	))}
</div>
```

### Content Visibility (listes longues)

```tsx
{
	/* Items hors viewport ne sont pas rendus */
}
<div className="content-defer">
	<ExpensiveListItem />
</div>;
```

> **Caveat** : `content-visibility: auto` peut masquer le contenu aux screen readers et casser la recherche navigateur (Ctrl+F) sur les items hors viewport. Utiliser uniquement pour les listes longues (50+ items) et tester avec un lecteur d'ecran. Preferer la cursor pagination pour limiter le nombre d'items rendus.

---

## 12. Accessibilite (WCAG 2.2 AA)

### Structure semantique

- Utiliser `ItemGroup` (`role="list"`) + wrapper `role="listitem"` autour de chaque card
- `aria-label` descriptif sur la liste : `<Stagger role="list" aria-label="Vos commandes recentes">`
- `aria-label` sur la card si le contenu visible n'est pas suffisant
- `aria-roledescription` sur les cards interactives pour contextualiser le type : `aria-roledescription="carte produit"`, `aria-roledescription="carte commande"`

### Voice Control & labels uniques

- Chaque action repetee dans une liste **doit** avoir un label unique incluant le nom de l'item :
  - `aria-label="Supprimer Bague Celeste"` (pas juste "Supprimer")
  - `aria-label="Ajouter Collier Luna au panier"` (pas juste "Ajouter au panier")
  - `aria-label="Voir la commande #SYN-2024-0042"` (pas juste "Voir")
- Permet a Voice Control de distinguer les actions identiques visuellement
- Patron : `aria-label={`${action} ${itemName}`}`

### Keyboard navigation

- **Tab** : Naviguer entre les items interactifs de la liste
- **Enter / Space** : Activer l'item (navigation ou action primaire)
- **Escape** : Fermer un menu contextuel ou deselectioner
- **Arrow keys** : Navigation dans les sous-elements (swatches, stepper quantite)
- Focus-visible : `outline: 2px solid var(--primary)` + `outline-offset: 2px` (gere globalement dans `globals.css`, certains composants overrident avec `ring`)

### Screen reader announcements

- Suppressions / changements d'etat : `aria-live="polite"` sur le conteneur ou `role="status"`
- Compteur selection : "3 elements selectionnes" avec `aria-live="polite"`
- Actions swipe : Annoncees via les labels des boutons equivalents
- Transitions de page : Gere par Next.js router announcements

### Focus management

- **Apres suppression** : Focus sur l'item suivant, ou precedent si dernier item
- **Apres ajout** : Focus sur le nouvel item (si visible)
- **Fermeture context menu** : Focus retourne sur l'item declencheur
- **Multi-selection** : Focus reste sur l'item courant, toolbar annoncee via `aria-live`

### Contraste & couleurs

- Texte : Minimum 4.5:1 (`text-muted-foreground` est WCAG AAA — ratio 4.5:1+)
- Elements UI : Minimum 3:1
- **Jamais de couleur seule** pour communiquer un statut — toujours coupler avec une icone ou du texte
- Dark mode : Tokens oklch auto-inverses, ratios preserves

### Reduced motion

- `prefers-reduced-motion` : `Stagger`, `StaggerGrid`, `Fade` desactivent automatiquement les animations
- `motion-safe:animate-pulse` sur les skeletons (pulse desactive en reduced motion)
- Swipe : Transition instantanee (pas de spring)
- Expand/collapse : Instantane (pas de height animation)

### Touch targets

- Touch target ≥ 44x44px (WCAG 2.5.8) — inclut le padding invisible si necessaire
- Boutons d'action rapide : `min-h-11 min-w-11` (44px)
- Espacement entre cibles : ≥ 8px

### Zoom 200%+ (WCAG 1.4.4)

- Les cards doivent rester lisibles et fonctionnelles a 200% de zoom
- Utiliser des unites relatives (`rem`, `em`) plutot que des `px` fixes pour le texte
- Eviter `overflow: hidden` sur les conteneurs de texte — preferer `text-overflow: ellipsis`
- Tester avec zoom navigateur 200% + rotation ecran

---

## 13. Performance mobile

### Virtualisation (listes longues)

- **< 50 items** : Rendu direct avec `StaggerGrid` / `Stagger`
- **50-200 items** : `content-visibility: auto` (`.content-defer`) sur chaque item — voir caveat a11y en section 11
- **200+ items** : `@tanstack/react-virtual` pour virtualisation complete (non installe — a ajouter si le besoin se presente)
- **Cursor pagination** : Pattern existant — ne jamais charger 200+ items d'un coup

### Rendering GPU-friendly

- **Animer uniquement** `transform` et `opacity` — GPU-composited, 60fps garanti
- **Eviter d'animer** : `box-shadow`, `border-radius`, `filter`, `clip-path` (trigger repaint)
- `will-change: transform, opacity` pendant l'animation uniquement (gere par Motion)
- `contain: content` sur les cards pour isoler le layout recalculation

### Images

- `loading="lazy"` sur tous les thumbnails sous le fold
- `priority` prop sur les 2-4 premieres `<Image>` de la liste (above-the-fold) — pattern idiomatique Next.js, ajoute automatiquement `fetchPriority="high"` et desactive le lazy loading
- `aspect-ratio` explicite pour eviter CLS : `aspect-square` ou `aspect-3/4`
- `sizes` prop avec breakpoints pour eviter de charger des images trop grandes
- Next.js `<Image>` avec `placeholder="blur"` (blur hash deja genere dans le projet)

### Prefetch & Preload

- **Pagination** : Prefetch des images de la page suivante quand le scroll atteint 80% de la liste (`IntersectionObserver` sur l'avant-dernier item)
- **Navigation** : Preload de la fiche produit au `onTouchStart` (300ms avant le tap complet) via `router.prefetch()`
- **Next.js** : Le prefetch des routes est gere automatiquement par `<Link>`, mais le preload des images critiques de la destination peut etre ajoute manuellement

### INP (Interaction to Next Paint)

- Budget INP : < 200ms pour toutes les interactions (tap, swipe, expand)
- Les animations GPU-composited (`transform`, `opacity`) ne bloquent pas le main thread
- Eviter les `setState` synchrones dans les event handlers de geste — preferer `startTransition` pour les updates non urgentes

### Debounce & Throttle

- Scroll listeners : Passive (`{ passive: true }`) — deja fait dans `useEdgeSwipe`
- Resize : `useSyncExternalStore` plutot que `addEventListener` + debounce
- Swipe gesture : Calculs dans `requestAnimationFrame`

### Battery & Low-end devices

- `useIsTouchDevice()` + `disableOnTouch` sur `Stagger` / `Fade` pour desactiver les animations lourdes sur mobile si necessaire
- Max 8 items animes simultanes (au-dela, apparition instantanee)
- Skeletons : `motion-safe:animate-pulse` (pulse desactive si reduced motion)

---

## 14. Dark mode mobile

Les tokens oklch du projet s'inversent automatiquement, mais certains ajustements sont specifiques au mobile :

### Ombres

- `shadow-*` est invisible sur fond sombre — preferer `ring-1 ring-border/50` pour delimiter les cards en dark mode
- `shadow-lg` sur DragOverlay reste visible grace a l'opacite elevee, mais ajouter `dark:ring-1 dark:ring-border/30` en complement

### Images & thumbnails

- Sur ecrans OLED (majorite des mobiles 2026), les blancs purs eblouissent — appliquer `dark:brightness-90` sur les thumbnails produit si fond blanc
- Les placeholder blur hash s'adaptent automatiquement si generes en oklch

### Hierarchie de fonds

- `bg-background` (teinte) pour le fond de page
- `bg-card` (pur) pour les cards — cree la hierarchie visuelle en dark mode ou la difference light est subtile
- Eviter `bg-muted` comme fond de card en dark mode (trop proche de `bg-background`)

### Contraste

- `text-muted-foreground` : oklch 0.55 en light, verifie WCAG AAA (4.5:1+) — le token dark doit maintenir ce ratio
- Badges : les variantes semantiques (`success`, `warning`, `destructive`) ajustent automatiquement leur contraste via oklch
- Bordures `ring-border/50` : opacite 50% peut etre insuffisante en dark — tester et ajuster a `ring-border/70` si necessaire

### Forced-colors mode — a implementer

Pour Windows High Contrast et Android accessibility. Non present dans le codebase actuellement — a ajouter dans `app/globals.css` :

```css
@media (forced-colors: active) {
	[data-slot="item"] {
		border: 1px solid ButtonText;
	}
	[data-slot="badge"] {
		border: 1px solid currentColor;
	}
}
```

---

## 15. Tendances mobile 2025-2026

| Tendance                   | Description                                                     | Implementation Synclune                             |
| -------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| **Container Queries**      | Card qui s'adapte a son conteneur, pas au viewport              | `@container/card` deja en place                     |
| **View Transitions**       | Morphing fluide entre list et detail                            | `unstable_ViewTransition` (Next.js 16)              |
| **Scroll-driven**          | Animations liees au scroll sans JS                              | 6 deja implementees, `animation-timeline: scroll()` |
| **Micro-interactions**     | Feedback a chaque action (checkmark anime, compteur qui bounce) | `MOTION_CONFIG.spring.success`                      |
| **Adaptive layout**        | Card qui s'adapte au contenu (pas de hauteur fixe)              | `ItemGroup` + `Item` flexbox                        |
| **Contextual actions**     | Actions qui changent selon l'etat (ex: "Expedier" → "Suivre")   | Badge + actions dynamiques                          |
| **Progressive disclosure** | Info essentielle visible, details au tap                        | Variante Expandable                                 |
| **Skeleton-first**         | Skeleton affiche immediatement, jamais de spinner plein ecran   | `SkeletonGroup` + shimmer variant                   |
| **Semantic color**         | Statut visible par couleur ET icone (pas de couleur seule)      | `Badge` avec icone + texte                          |
| **Glassmorphism subtil**   | `backdrop-blur-sm` sur les overlays uniquement                  | Context menu backdrop                               |
| **Scroll snap**            | Listes horizontales avec snap magnetique                        | `.scroll-snap-x` + `.snap-start`                    |

---

## 16. Anti-patterns a eviter

- Cards trop hautes (> 120px) dans une liste scrollable
- Plus de 3 niveaux d'information textuelle
- Boutons d'action multiples visibles dans la card (1 max, le reste en swipe/menu)
- Ombres lourdes sur chaque card (fatigue visuelle) — preferer `ring-1 ring-border/50`
- Animations de plus de 300ms sur les interactions directes — `MOTION_CONFIG.duration.slow` max
- Separateurs epais ou fortement contrastes
- Thumbnail trop petit (< `size-10`) ou trop grand (> `size-20`)
- Texte non tronque qui wrap sur 4+ lignes
- Hover states sur mobile (utiliser `can-hover:` exclusivement)
- Animer `box-shadow` ou `filter` (utiliser `transform` + `opacity`)
- Listes longues sans virtualisation ou `content-visibility`
- Couleur seule pour communiquer un statut (toujours coupler avec icone/texte)
- `border-radius` ad-hoc — utiliser la scale du projet (`rounded-md` / `rounded-lg` / `rounded-xl`)
- Spring configs ad-hoc — utiliser `MOTION_CONFIG.spring.*` pour la coherence

---

## 17. Strategie de test

### Hooks custom (useLongPress, useSwipe)

- **Vitest + Testing Library** : tester les handlers retournes, les seuils de declenchement, le cancel au scroll
- Mocker `TouchEvent` avec `clientX`/`clientY` pour simuler les gestes
- Verifier que `isPressing` bascule correctement pendant le delai

### Composants de liste

- **Tests unitaires** : rendu correct des variantes (compact/standard/rich), skeleton count, empty state
- **Tests a11y** : `role="list"` / `role="listitem"`, `aria-label` uniques, `aria-live` sur les compteurs
- Utiliser `axe-core` via `@axe-core/playwright` (deja installe) pour les verifications automatiques

### Interactions tactiles

- **E2E (Playwright)** : simuler swipe avec `page.dispatchEvent()` + `TouchEvent` ou sequence `touchscreen.tap()` + `mouse.move()`, verifier l'action declenchee
- Tester le long press avec `page.touchscreen.tap()` + delai
- Verifier le focus management apres suppression (focus sur item suivant)

### Performance

- **Playwright** : mesurer le CLS sur les listes avec skeletons → images (doit etre < 0.1)
- Verifier que `content-visibility` ne casse pas Ctrl+F sur les 10 premiers items
- `pnpm size` pour verifier que les nouveaux composants ne gonflent pas le bundle
