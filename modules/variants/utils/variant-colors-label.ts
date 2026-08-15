/**
 * Helpers d'affichage de la couleur d'une variante.
 *
 * Schéma lean (lot 2) : une variante porte UNE couleur (FK nullable).
 */

type ColorInput = { name: string; hex?: string | null } | null | undefined;

/** Variante UI du label (identique — conservée pour parité d'API). */
export function getVariantColorsDisplayLabel(color: ColorInput): string | null {
	return color?.name ?? null;
}

/** Liste plate des noms (0 ou 1 élément). */
export function getColorNames(color: ColorInput): string[] {
	return color ? [color.name] : [];
}

/** Liste plate des hex (0 ou 1 élément). */
export function getColorHexes(color: ColorInput): string[] {
	return color?.hex ? [color.hex] : [];
}
