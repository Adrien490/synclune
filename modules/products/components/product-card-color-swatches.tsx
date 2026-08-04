"use client";

import Link from "next/link";

import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { areAllColorsLight, buildSwatchStyle } from "@/modules/colors/utils/swatch-style";
import { MAX_COLOR_SWATCHES } from "@/modules/products/constants/product-texts.constants";
import type { ColorSwatch } from "@/modules/products/types/product-list.types";
import { cn } from "@/shared/utils/cn";

interface ProductCardColorSwatchesProps {
	colors: ColorSwatch[];
	productUrl: string;
	title: string;
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
 */
export function ProductCardColorSwatches({
	colors,
	productUrl,
	title,
}: ProductCardColorSwatchesProps) {
	return (
		// `role="list"` explicite : `list-none` fait perdre la sémantique liste à
		// VoiceOver/Safari, qui n'annoncerait plus le nombre de variantes
		// eslint-disable-next-line jsx-a11y/no-redundant-roles -- redondant en HTML, pas pour VoiceOver avec list-style:none
		<ul
			role="list"
			className="relative z-30 m-0 flex list-none items-center gap-2 p-0"
			aria-label={`${colors.length} variantes disponibles pour ${title}`}
		>
			{colors.slice(0, MAX_COLOR_SWATCHES).map((color) => {
				const isCombo = Boolean(color.comboKey) && (color.hexes?.length ?? 0) > 1;
				const hexes = color.hexes && color.hexes.length > 0 ? color.hexes : [color.hex];
				const href = isCombo
					? `${productUrl}?variant=${color.comboKey}`
					: `${productUrl}?color=${color.slug}`;
				const allLight = areAllColorsLight(hexes, (hex) => isLightColor(hex, 0.85));
				const variantLabel = `${title} en ${color.name}${!color.inStock ? " - indisponible" : ""}`;

				return (
					<li key={color.slug}>
						<Link
							href={href}
							className={cn(
								"focus-ring border-foreground/15 relative block shrink-0 rounded-full border",
								// Pastille un cran plus grande en mode combo (lisibilité gradient)
								isCombo ? "size-9 sm:size-10" : "size-7 sm:size-8",
								"motion-safe:can-hover:hover:scale-110 motion-safe:can-hover:hover:-translate-y-0.5 motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)]",
								"after:absolute after:-inset-2 after:rounded-full after:content-['']",
								allLight && "ring-border/30 ring-1",
								!color.inStock && "opacity-50",
							)}
							style={{
								...buildSwatchStyle(hexes),
								// View Transition vers le sélecteur PDP (même comboKey). En mode
								// legacy mono, on n'expose pas de name (le PDP n'a pas de pastille
								// VT-correspondante de toute façon).
								...(isCombo ? { viewTransitionName: `variant-pill-${color.comboKey}` } : {}),
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
				<li>
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
	);
}
