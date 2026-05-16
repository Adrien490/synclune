/**
 * Helpers d'affichage pour la relation M2M ProductSku <-> Color.
 *
 * L'ordre des couleurs dans le tableau reflète la priorité saisie côté admin :
 * - position[0] = couleur principale (utilisée pour vignette listing/PDP, snapshot facture)
 * - position[1..N] = couleurs secondaires (bicolore, tricolore, dégradé)
 *
 * Les requêtes Prisma doivent toujours inclure `orderBy: { position: "asc" }`
 * sur la relation `colors` pour garantir cet invariant côté front.
 */

type SkuColorEntry = {
	color: {
		name: string;
		hex?: string;
		slug?: string;
	};
};

type SkuColorsInput = readonly SkuColorEntry[] | null | undefined;

/**
 * Retourne le label compact joint des couleurs d'un SKU, ordre = priorité.
 * Convention Synclune : " · " comme séparateur (parité matériaux/snapshot facture).
 *
 * @example
 * getSkuColorsLabel([{ color: { name: "Or rose" } }, { color: { name: "Argent" } }])
 * // → "Or rose · Argent"
 *
 * @returns `null` si aucune couleur, sinon les noms joints par " · ".
 */
export function getSkuColorsLabel(colors: SkuColorsInput): string | null {
	if (!colors || colors.length === 0) return null;
	return colors.map((c) => c.color.name).join(" · ");
}

/**
 * Variante UI du label (séparateur " + ") pour l'affichage storefront/admin
 * où la combinaison « couleur A + couleur B » est plus naturelle qu'un point.
 */
export function getSkuColorsDisplayLabel(colors: SkuColorsInput): string | null {
	if (!colors || colors.length === 0) return null;
	return colors.map((c) => c.color.name).join(" + ");
}

/**
 * Retourne la couleur principale (1re de la liste).
 *
 * @returns `null` si aucune couleur, sinon le nom de la 1re.
 */
export function getPrimaryColorName(colors: SkuColorsInput): string | null {
	return colors?.[0]?.color.name ?? null;
}

/**
 * Retourne la liste plate des noms de couleurs (ordre préservé).
 */
export function getColorNames(colors: SkuColorsInput): string[] {
	if (!colors || colors.length === 0) return [];
	return colors.map((c) => c.color.name);
}

/**
 * Retourne la liste plate des hex (ordre préservé) — utile pour pastilles
 * split-gradient / conic-gradient via `buildSwatchStyle`.
 */
export function getColorHexes(colors: SkuColorsInput): string[] {
	if (!colors || colors.length === 0) return [];
	return colors.flatMap((c) => (c.color.hex ? [c.color.hex] : []));
}
