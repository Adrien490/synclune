"use client";

import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import type * as React from "react";

import { cn } from "@/shared/utils/cn";

/**
 * Mega-menu de la navbar boutique, sur Base UI.
 *
 * Était le **dernier îlot Radix** du dépôt après `8a5131b62` (migration Radix →
 * Base UI) : sheet, dialog, dropdown et tooltip étaient passés, pas celui-ci. Deux
 * bibliothèques d'overlay = deux piles de dismiss et de focus indépendantes, ce
 * que `nested-overlay-stacking.regression.test.tsx` documente comme la cause
 * directe d'un bug déjà payé (Échap fermait la confirmation ET la sheet).
 *
 * Trois conséquences structurelles de la bascule, toutes voulues :
 *
 * 1. **Le panneau est portalisé** (`Portal` → `<body>`) au lieu d'être rendu dans
 *    le `<header>`. Il n'est donc plus confiné au contexte d'empilement du header,
 *    ce qui supprime *par construction* le recouvrement par la barre CTA sticky de
 *    la PDP (`--z-bar-desktop`, même `top` que le panneau).
 * 2. **Le panneau est ancré et dimensionné** par le `Positioner`, au lieu de sortir
 *    du flux à coups de `fixed! left-0! right-0! w-screen!`. `w-screen` valait
 *    `100vw`, gouttière de scrollbar comprise — donc un débordement horizontal
 *    d'environ 15px sur desktop.
 * 3. **Les transitions remplacent les keyframes.** Base UI expose
 *    `data-starting-style` / `data-ending-style`, pilotés par transition — c'est le
 *    modèle que CLAUDE.md impose déjà aux panneaux (une `animate-in` écraserait le
 *    translate et `fill-mode: both` figerait la valeur finale).
 *
 * Correspondances qui ne sont PAS des renommages : `asChild` → `render`,
 * `data-[state=open]` → `data-open` (popup) et `data-popup-open` (trigger),
 * `onCloseAutoFocus` → `finalFocus`.
 */
function NavigationMenu({ className, ...props }: NavigationMenuPrimitive.Root.Props) {
	return (
		<NavigationMenuPrimitive.Root
			data-slot="navigation-menu"
			// `render={<div />}` : le Root de Base UI rend un `<nav>`. La navbar en
			// expose déjà un (`aria-label="Navigation principale"`) — deux `<nav>`
			// imbriqués donneraient deux landmarks pour une seule navigation.
			render={<div />}
			className={cn("relative flex max-w-max flex-1 items-center justify-center", className)}
			{...props}
		/>
	);
}

function NavigationMenuList({ className, ...props }: NavigationMenuPrimitive.List.Props) {
	return (
		<NavigationMenuPrimitive.List
			data-slot="navigation-menu-list"
			// Pas de `group` nu ici. L'ancienne version en portait un, et c'est lui
			// que capturaient les `group-hover:` des descendants faute de `group`
			// local : les icônes de catégorie restaient teintées en permanence dès
			// que le panneau était ouvert. Les descendants nomment désormais leur
			// propre groupe (`group/item`).
			className={cn("flex flex-1 list-none items-center justify-center gap-1", className)}
			{...props}
		/>
	);
}

function NavigationMenuItem({ className, ...props }: NavigationMenuPrimitive.Item.Props) {
	return (
		<NavigationMenuPrimitive.Item
			data-slot="navigation-menu-item"
			className={cn("relative", className)}
			{...props}
		/>
	);
}

const navigationMenuTriggerStyle =
	"inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50 focus-ring";

function NavigationMenuTrigger({
	className,
	children,
	showChevron = true,
	...props
}: NavigationMenuPrimitive.Trigger.Props & { showChevron?: boolean }) {
	return (
		<NavigationMenuPrimitive.Trigger
			data-slot="navigation-menu-trigger"
			className={cn(navigationMenuTriggerStyle, "group/trigger", className)}
			{...props}
		>
			{children}
			{showChevron && (
				<CaretDownIcon
					// `group-data-popup-open:` et non `group-data-[state=open]:` : Base UI
					// expose l'état du popup sur le trigger par un attribut PRÉSENT ou
					// ABSENT (`data-popup-open`), pas par une valeur.
					className="relative top-px ml-1 size-3 shrink-0 motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:group-data-popup-open/trigger:rotate-180"
					aria-hidden="true"
				/>
			)}
		</NavigationMenuPrimitive.Trigger>
	);
}

/**
 * Contenu d'un item, déplacé dans le `Viewport` du popup quand l'item devient
 * actif. `keepMounted` est volontairement laissé à `false` : les liens du
 * mega-menu dupliquent ceux du sheet mobile et du footer, donc rien n'est perdu
 * pour l'indexation.
 */
function NavigationMenuContent({ className, ...props }: NavigationMenuPrimitive.Content.Props) {
	return (
		<NavigationMenuPrimitive.Content
			data-slot="navigation-menu-content"
			className={cn(
				"h-full w-full",
				"motion-safe:transition-[opacity,translate] motion-safe:duration-[var(--duration-normal)] motion-safe:ease-[var(--ease-premium)]",
				"data-ending-style:opacity-0 data-starting-style:opacity-0",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Le popup ancré. À composer une seule fois, en frère de la `List`.
 *
 * Le dimensionnement suit `--popup-width` / `--popup-height`, publiées par Base UI
 * d'après le contenu actif : c'est ce qui fait le morphing d'un panneau à l'autre.
 */
function NavigationMenuPopup({
	className,
	children,
	sideOffset = 8,
	align = "center",
	collisionPadding = 16,
	...props
}: NavigationMenuPrimitive.Popup.Props &
	Pick<
		NavigationMenuPrimitive.Positioner.Props,
		"sideOffset" | "align" | "alignOffset" | "collisionPadding"
	>) {
	return (
		<NavigationMenuPrimitive.Portal>
			<NavigationMenuPrimitive.Positioner
				side="bottom"
				sideOffset={sideOffset}
				align={align}
				collisionPadding={collisionPadding}
				className="isolate z-(--z-float) outline-none"
			>
				<NavigationMenuPrimitive.Popup
					data-slot="navigation-menu-popup"
					// `render={<div />}` : le Popup rend un `<nav>` par défaut — encore un
					// landmark de trop, le panneau vivant déjà sous la navigation principale.
					render={<div />}
					className={cn(
						"bg-popover text-popover-foreground",
						"h-(--popup-height) w-(--popup-width)",
						// Pas d'`overflow-hidden` ici : c'est le `Viewport` qui clippe le
						// contenu (avec le même rayon), ce qui laisserait sortir du cadre un
						// décor volontairement débordant. ⚠️ Aucun appelant n'en pose plus :
						// le ruban qui justifiait cette liberté se posait sur la rangée de nav
						// (cf. `desktop-nav.tsx`). Un débord VERS LE HAUT recouvre le trigger.
						//
						// Chrome PAPIER (direction B « La boîte à perles », artifact
						// 2026-08-05) : le grain de `.polaroid-paper` et l'ombre
						// `--shadow-paper` — les mêmes que le sol du header — font du panneau
						// un morceau du même objet, plus un popover générique. Le `relative`
						// ancre le ::before du grain (inset-0, z-1, pointer-events-none) ;
						// à 3,5 % en multiply il se pose sur tout le panneau, photos incluses,
						// comme sur les cartes Atelier.
						"polaroid-paper relative",
						"shadow-paper origin-(--transform-origin) rounded-xl border",
						"max-w-(--available-width)",
						// Transition, pas keyframes : entrée, sortie ET morphing entre deux
						// panneaux partagent les mêmes propriétés.
						"motion-safe:transition-[opacity,transform,width,height] motion-safe:duration-[var(--duration-normal)] motion-safe:ease-[var(--ease-premium)]",
						"data-starting-style:scale-[0.98] data-starting-style:opacity-0",
						"data-ending-style:scale-[0.98] data-ending-style:opacity-0",
						className,
					)}
					{...props}
				>
					{/* `children` = DÉCOR uniquement (ruban, filet…). Le contenu réel est
					    déplacé dans le `Viewport` par Base UI quand un item devient actif —
					    ne rien y passer à la main. */}
					{children}
					<NavigationMenuPrimitive.Viewport
						data-slot="navigation-menu-viewport"
						className="relative h-full w-full overflow-hidden rounded-[inherit]"
					/>
				</NavigationMenuPrimitive.Popup>
			</NavigationMenuPrimitive.Positioner>
		</NavigationMenuPrimitive.Portal>
	);
}

/**
 * Lien du mega-menu.
 *
 * ⚠️ Volontairement SANS classe de mise en page. L'ancienne version imposait
 * `flex flex-col gap-1`, ce qui obligeait deux call sites à la défaire avec un
 * `flex-row!` — un défaut par défaut. Le lien ne pose plus que le focus visible
 * et la taille des icônes ; la mise en page appartient à l'appelant.
 *
 * ⚠️ **Le dimensionnement d'icône épargne le trait dessiné à la main.**
 * `[&_svg:not([class*='size-'])]:size-4` est une commodité pour les pictogrammes,
 * mais sa spécificité (`.classe svg:not(…)`) écrase les `h-*` / `w-*` que
 * l'appelant pose sur le SVG lui-même. `SquiggleUnderline` se déclare en
 * `h-2 w-[calc(100%-1.5rem)]` — sans `size-`, donc non exempté : le soulignement
 * du header rendait **16 × 16 px**, un gribouillis sous la première lettre au
 * lieu d'un trait courant sous le libellé. Le repère d'`aria-current="page"` de
 * la nav n'était donc pas seulement trop pâle, il était aussi à la mauvaise
 * échelle — et seule une entrée ACTIVE le rend visible, ce qui l'a caché
 * jusqu'ici. L'exclusion se fait sur `data-slot`, stable, et non sur une classe
 * qu'un `cn()` peut réordonner.
 */
function NavigationMenuLink({ className, ...props }: NavigationMenuPrimitive.Link.Props) {
	return (
		<NavigationMenuPrimitive.Link
			data-slot="navigation-menu-link"
			className={cn(
				"[&_svg:not([class*='text-'])]:text-muted-foreground focus-ring",
				"[&_svg:not([data-slot='squiggle-underline']):not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

export {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuPopup,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
};
