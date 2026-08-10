import type { ComponentProps } from "react";

import { cn } from "@/shared/utils/cn";

/**
 * La « tranche d'étagère » — barre d'outils collante au vocabulaire Atelier.
 *
 * @description
 * Née comme peau de la barre du catalogue (direction B de l'artifact « La barre de
 * l'étal », 2026-08-05), extraite ici pour servir toute surface qui pose des
 * gestes sur un rebord collant : papier opaque + grain (`.polaroid-paper`) +
 * `--shadow-paper` (c'est l'ombre qui sépare la tranche du contenu qui glisse
 * dessous, pas un filet ni un blur), boutons-étiquettes, et
 * matérialisation au défilement (`.shelf-materialize`, `components.css`) :
 * lisière fantôme en haut de page, papier plein dès que le contenu glisse
 * dessous — sans support ou en reduced-motion, l'état papier est permanent.
 *
 * Composition type :
 *
 * ```tsx
 * <ShelfBar aria-label="Filtres">
 *   <div className="flex flex-1 items-center gap-2 py-2 md:ml-auto md:flex-none md:py-0">
 *     <ShelfBarButton active accent="rose">…</ShelfBarButton>
 *   </div>
 * </ShelfBar>
 * ```
 *
 * Aucun composant de ce fichier n'a de `"use client"` : la coque est
 * universelle. (`ShelfBarToolbar` et le roving focus ont été retirés le
 * 2026-08-06 avec la réduction de la barre catalogue à un seul geste — un
 * bouton unique n'est pas une toolbar.)
 */

/**
 * Les quatre accents de marque en version « étiquette » : fond/bord
 * d'état actif. Classes LITTÉRALES par accent — Tailwind ne compile que ce
 * qu'il lit, une template string ne produirait rien. Registre imposé par la
 * SSOT des accents (`catalog-accents.constants.ts`) : des SURFACES, jamais de
 * l'encre — le texte reste `--foreground`.
 */
const SHELF_BAR_ACCENTS = {
	rose: {
		active: "border-primary/40 bg-primary/10",
	},
	lavender: {
		active: "border-brand-lavender/40 bg-brand-lavender/10",
	},
	mint: {
		active: "border-brand-mint/40 bg-brand-mint/10",
	},
	sun: {
		active: "border-brand-sun/40 bg-brand-sun/10",
	},
} as const;

export type ShelfBarAccent = keyof typeof SHELF_BAR_ACCENTS;

/**
 * La coque seule, SANS le sticky — partagée entre `ShelfBar` et les squelettes
 * miroirs (un squelette n'a pas besoin de coller, mais doit avoir la même
 * peau et la même hauteur, sinon CLS au swap Suspense).
 *
 * `relative` n'est pas décoratif : le grain de `.polaroid-paper` est un
 * `::before` en `absolute inset-0` — sans ancre positionnée, il s'étalerait
 * sur le premier ancêtre positionné (souvent la `<section>` entière).
 * Le full-bleed (`-mx-4`…) suppose le padding standard du conteneur
 * storefront (`px-4 sm:px-6 lg:px-8`) — à surcharger ailleurs.
 */
export const SHELF_BAR_SHELL = cn(
	"relative",
	"polaroid-paper bg-card shadow-paper",
	"shelf-materialize border-b border-transparent",
	"-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
);

/**
 * Les gestes sont des ÉTIQUETTES posées sur le rebord : encre `--foreground`
 * au repos (un gris muted ferait chrome anonyme), bord papier, rayon `sm`,
 * cible tactile 44 px (h-11). L'état actif se dit par la FORME — fond teinté,
 * bord teinté, rotation −1° — jamais par la seule couleur.
 */
const SHELF_BAR_BUTTON = cn(
	"relative flex flex-1 items-center justify-center gap-1.5 h-11 min-w-0 px-2",
	"md:flex-none md:gap-2 md:px-3.5 md:text-[0.8125rem]",
	"text-xs font-medium text-foreground",
	"bg-background border-border rounded-sm border",
	"hover:bg-muted/60 active:scale-[0.98]",
	"transition-[color,background-color,border-color,transform] duration-200 ease-[var(--ease-smooth-out)] motion-reduce:transition-colors",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset md:focus-visible:ring-offset-0",
);

/**
 * La coque collante. `aria-label` requis : c'est un `<nav>`.
 *
 * Collante sous `--navbar-height-static` — **jamais** `--navbar-height`, qui
 * se contracte de 5rem à 4rem au défilement et ferait remonter la barre de
 * 16 px au premier pixel scrollé (deux bugs déjà payés, assertion négative
 * dans `product-filter-bar.test.tsx`). Le `sticky` est posé APRÈS la coque :
 * `relative` (ancre du grain) et `sticky` sont le même groupe de position,
 * l'ordre de merge décide du gagnant.
 */
export function ShelfBar({
	className,
	children,
	...props
}: ComponentProps<"nav"> & { "aria-label": string }) {
	return (
		<nav
			className={cn(SHELF_BAR_SHELL, "sticky top-[var(--navbar-height-static)] z-30", className)}
			{...props}
		>
			<div className="flex items-stretch gap-3">{children}</div>
		</nav>
	);
}

interface ShelfBarButtonProps extends ComponentProps<"button"> {
	/** État actif : fond/bord teintés + rotation −1°. */
	active?: boolean;
	/** Accent de la surface hôte — rose par défaut, hors de tout contexte. */
	accent?: ShelfBarAccent;
	/**
	 * Badge compteur (`aria-hidden` : le nombre doit être porté par le nom
	 * accessible du bouton, le badge n'est que sa forme visible).
	 */
	count?: number;
}

/** Une étiquette posée sur le rebord. */
export function ShelfBarButton({
	active = false,
	accent = "rose",
	count,
	className,
	children,
	...props
}: ShelfBarButtonProps) {
	const styles = SHELF_BAR_ACCENTS[accent];

	return (
		<button
			type="button"
			className={cn(SHELF_BAR_BUTTON, active && cn("-rotate-1", styles.active), className)}
			{...props}
		>
			{children}
			{count !== undefined && (
				<span
					className="bg-primary text-primary-foreground text-2xs inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 font-bold"
					aria-hidden="true"
				>
					{count}
				</span>
			)}
		</button>
	);
}
