/**
 * Titre lisible d'une variante à partir de ses attributs (couleur · matériau ·
 * taille). Schéma lean (lot 2) : un attribut de chaque au plus.
 */

interface VariantLikeForTitle {
	color?: { name: string } | null;
	material?: { name: string } | null;
	size?: string | null;
	/** Vrai si la variante est le représentant du produit (première par id). */
	isRepresentative?: boolean;
}

/**
 * Construit un titre lisible pour une variante (couleur · matériau · taille).
 * Évite l'affichage d'un id technique comme titre principal côté UI.
 *
 * - 1+ attributs → join par " · "
 * - Aucun attribut + isRepresentative → "Variante principale"
 * - Aucun attribut + !isRepresentative → "Variante sans attribut"
 *
 * Pour un aria-label lu par screen reader, utiliser `getVariantDisplayTitleSpoken()`.
 */
export function getVariantDisplayTitle(variant: VariantLikeForTitle): string {
	const parts: string[] = [];
	if (variant.color?.name.trim()) parts.push(variant.color.name);
	if (variant.material?.name.trim()) parts.push(variant.material.name);
	const size = variant.size?.trim();
	if (size) parts.push(size);

	if (parts.length > 0) return parts.join(" · ");
	return variant.isRepresentative ? "Variante principale" : "Variante sans attribut";
}

/**
 * Variante « parlée » du titre, pour les `aria-label` des screen readers :
 * " · " → ", ".
 */
export function getVariantDisplayTitleSpoken(variant: VariantLikeForTitle): string {
	return getVariantDisplayTitle(variant).replace(/ · /g, ", ");
}
