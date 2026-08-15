"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { areAllColorsLight, buildSwatchStyle } from "@/modules/colors/utils/swatch-style";
import {
	COLOR_COUNT_LABEL,
	MAX_COLOR_SWATCHES,
} from "@/modules/products/constants/product-texts.constants";
import type { ColorSwatch } from "@/modules/products/types/product-list.types";
import { cn } from "@/shared/utils/cn";

interface ProductCardColorSwatchesProps {
	colors: ColorSwatch[];
	productUrl: string;
	title: string;
}

/** Décalage de la cascade entre deux pastilles, en millisecondes. */
const SWATCH_STAGGER_MS = 40;

/**
 * Classes de la cascade de révélation, portées par chaque `<li>`.
 *
 * ⚠️ Sur le `<li>` et NON sur le `<Link>` : celui-ci a déjà son propre
 * `hover:scale-110` + `transition-transform`, les deux échelles se composent
 * proprement en imbriqué mais se marcheraient dessus sur le même élément.
 *
 * Trois invariants, chacun est un défaut déjà payé dans ce dépôt :
 * - c'est le **masquage** qui est gaté `sm:can-hover:`, jamais un `sm:opacity-0`
 *   nu : sur tactile ≥ sm (iPad) aucun survol ne peut révéler les pastilles, et
 *   des liens en `opacity-0` resteraient cliquables au-dessus du lien étiré ;
 * - la parité focus (`sm:group-focus-within:`) n'est PAS derrière `can-hover:` —
 *   elle ne s'appliquerait jamais au clavier sur tactile (WCAG 2.4.7) ;
 * - `transition-[opacity,scale]` et non `transform` : Tailwind v4 compile
 *   `scale-*` vers la propriété autonome `scale`, l'échelle sauterait à la
 *   frame 1 et seule l'opacité fondrait.
 *
 * Le `transition-delay` n'existe QUE dans les variantes hover/focus : le délai
 * appliqué étant celui de l'état vers lequel on transitionne, l'entrée se fait
 * en cascade et la sortie d'un bloc, immédiatement.
 */
const SWATCH_REVEAL = cn(
	"sm:can-hover:scale-75 sm:can-hover:opacity-0",
	"sm:can-hover:group-hover:scale-100 sm:can-hover:group-hover:opacity-100 sm:can-hover:group-hover:[transition-delay:var(--swatch-delay)]",
	"sm:group-focus-within:scale-100 sm:group-focus-within:opacity-100 sm:group-focus-within:[transition-delay:var(--swatch-delay)]",
	"motion-safe:transition-[opacity,scale] motion-safe:duration-[var(--duration-normal)]",
);

function swatchDelay(index: number): CSSProperties {
	return { "--swatch-delay": `${index * SWATCH_STAGGER_MS}ms` } as CSSProperties;
}

/**
 * Pastilles couleur sur ProductCard.
 *
 * Détecte automatiquement le mode :
 * - **Combos M2M** (`color.comboKey` présent) : lien `?variant=<comboKey>`,
 *   pastille split-gradient via `buildSwatchStyle(color.hexes)`, label combiné.
 * - **Legacy** (mono-couleur) : lien `?color=<slug>`, pastille mono via
 *   `backgroundColor`.
 *
 * Les pastilles multi-couleur sont rendues légèrement plus grandes pour rester
 * lisibles à l'œil (`size-9 sm:size-10` vs `size-7 sm:size-8` en mono).
 *
 * ## Bascule desktop : « Disponible en N coloris » ⇄ pastilles
 *
 * Sur pointeur fin ≥ `sm`, les pastilles cèdent la place au repos à une ligne de
 * texte discrète, et reviennent en cascade au survol (ou au focus clavier) de la
 * carte — 12 cartes × 5 pastilles saturaient la légende de la grille. Sur
 * tactile, où aucun survol ne peut les faire venir, elles restent affichées en
 * permanence et le texte n'est pas rendu du tout.
 *
 * Les deux calques occupent la MÊME cellule de grille (`col-start-1
 * row-start-1`) : la hauteur de la ligne reste celle des pastilles, donc la
 * carte ne bouge pas au survol et le `mt-auto` du CTA mobile garde son
 * alignement de rangée.
 *
 * Le `group` exploité ici vient de `CARD_SURFACE_POLAROID`, posé sur
 * l'`<article>` parent.
 */
export function ProductCardColorSwatches({
	colors,
	productUrl,
	title,
}: ProductCardColorSwatchesProps) {
	return (
		<div className="grid">
			{/* `role="list"` explicite : `list-none` fait perdre la sémantique liste à
			    VoiceOver/Safari, qui n'annoncerait plus le nombre de variantes */}
			{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- redondant en HTML, pas pour VoiceOver avec list-style:none */}
			<ul
				role="list"
				className="relative z-30 col-start-1 row-start-1 m-0 flex list-none items-center gap-2 p-0"
				aria-label={`${colors.length} variantes disponibles pour ${title}`}
			>
				{colors.slice(0, MAX_COLOR_SWATCHES).map((color, index) => {
					const hexes = [color.hex];
					const href = `${productUrl}?color=${color.slug}`;
					const allLight = areAllColorsLight(hexes, (hex) => isLightColor(hex, 0.85));
					const variantLabel = `${title} en ${color.name}${!color.inStock ? " - indisponible" : ""}`;

					return (
						<li key={color.slug} style={swatchDelay(index)} className={SWATCH_REVEAL}>
							<Link
								href={href}
								className={cn(
									"focus-ring border-foreground/15 relative block shrink-0 rounded-full border",
									"size-7 sm:size-8",
									"motion-safe:can-hover:hover:scale-110 motion-safe:can-hover:hover:-translate-y-0.5 motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)]",
									// Extension du hit target SANS chevauchement : `-inset-1` (4 px)
									// porte la cible de 28→36 px en mono et 36→44 px en combo
									// (≥ 24 px, WCAG 2.5.8), et 4 px + 4 px = le `gap-2` exactement —
									// zones jointives. `-inset-2` donnait 44 px mais les zones se
									// recouvraient de 8 px : la pastille SUIVANTE gagnait tout le gap
									// par ordre de peinture, un tap au bord droit d'une pastille
									// activait sa voisine (audit ProductCard 2026-08-08).
									"after:absolute after:-inset-1 after:rounded-full after:content-['']",
									allLight && "ring-border/30 ring-1",
									!color.inStock && "opacity-50",
								)}
								style={{
									...buildSwatchStyle(hexes),
									// View Transition vers le sélecteur PDP (même slug de couleur).
									viewTransitionName: `variant-pill-${color.slug}`,
								}}
								aria-label={variantLabel}
							>
								{!color.inStock && (
									<span
										aria-hidden="true"
										className="absolute inset-0 flex items-center justify-center"
									>
										<span className="bg-foreground block h-[3px] w-[130%] rotate-[-45deg] rounded-full shadow-[0_0_0_1.5px_white]" />
									</span>
								)}
							</Link>
						</li>
					);
				})}
				{colors.length > MAX_COLOR_SWATCHES && (
					<li style={swatchDelay(MAX_COLOR_SWATCHES)} className={SWATCH_REVEAL}>
						<Link
							href={productUrl}
							className="text-muted-foreground relative z-30 flex min-h-11 min-w-11 items-center justify-center text-xs"
							aria-label={`Voir les ${colors.length} variantes disponibles pour ${title}`}
						>
							+{colors.length - MAX_COLOR_SWATCHES}
						</Link>
					</li>
				)}
			</ul>

			{/* Repli desktop. `aria-hidden` obligatoire : l'`aria-label` de la liste
			    ci-dessus annonce déjà le compte, sans quoi il serait dit deux fois.
			    `pointer-events-none` pour la même raison que les badges de stock — la
			    légende est couverte par le lien étiré (`after:z-10`).

			    Gater le MASQUAGE de ce calque en `can-hover:` n'est pas la faute que
			    la règle « jamais de focus derrière can-hover » vise : le texte est
			    décoratif, non focusable et doublé par l'aria-label. Même précédent que
			    la photo secondaire de la carte (`hidden can-hover:block`). */}
			<span
				aria-hidden="true"
				className={cn(
					"text-muted-foreground pointer-events-none col-start-1 row-start-1 self-center text-xs",
					"sm:can-hover:block hidden",
					"sm:can-hover:group-hover:-translate-y-0.5 sm:can-hover:group-hover:opacity-0",
					"sm:group-focus-within:-translate-y-0.5 sm:group-focus-within:opacity-0",
					"motion-safe:transition-[opacity,translate] motion-safe:duration-[var(--duration-normal)]",
				)}
			>
				{COLOR_COUNT_LABEL(colors.length)}
			</span>
		</div>
	);
}
