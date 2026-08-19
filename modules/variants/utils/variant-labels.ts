/**
 * SSOT des libellés d'une variante — schéma lean (lot 2) : une variante porte
 * AU PLUS une couleur (FK), un matériau (FK) et une taille.
 *
 * Ce fichier remplace les quatre modules d'origine (`variant-colors-label`,
 * `variant-materials-label`, `variant-display-title`, `variant-variant-label`),
 * qui exposaient sept fonctions pour un seul concept — dont deux getters
 * strictement identiques à un nom d'argument près (`color?.name` /
 * `material?.name`), aujourd'hui unifiés en `getAttributeLabel`.
 *
 * Typage STRUCTUREL volontaire (aucun import de type Prisma) : ces helpers sont
 * appelés depuis `cart`, `products` et `colors`, et un import croisé rouvrirait
 * la dépendance circulaire variants <-> products.
 */

type NamedAttribute = { name: string } | null | undefined;
type ColorAttribute = { name: string; hex?: string | null } | null | undefined;

interface VariantLikeForTitle {
	color?: { name: string } | null;
	material?: { name: string } | null;
	size?: string | null;
	/** Vrai si la variante est le représentant du produit (première par id). */
	isRepresentative?: boolean;
}

// ============================================================================
// ATTRIBUTS
// ============================================================================

/** Libellé d'un attribut nommé (couleur, matériau) — `null` si absent. */
export function getAttributeLabel(attribute: NamedAttribute): string | null {
	return attribute?.name ?? null;
}

/**
 * Liste plate des noms (0 ou 1 élément) — adaptateur pour `getSwatchAriaLabel`,
 * qui prend un tableau depuis le schéma M2M d'avant la migration lean.
 */
export function getColorNames(color: ColorAttribute): string[] {
	return color ? [color.name] : [];
}

/** Liste plate des hex (0 ou 1 élément) — adaptateur pour `buildSwatchStyle`. */
export function getColorHexes(color: ColorAttribute): string[] {
	return color?.hex ? [color.hex] : [];
}

// ============================================================================
// TITRES
// ============================================================================

/**
 * Construit un titre lisible pour une variante (couleur · matériau · taille).
 * Évite l'affichage d'un id technique comme titre principal côté UI.
 *
 * - 1+ attributs → join par " · "
 * - Aucun attribut + isRepresentative → "Variante principale"
 * - Aucun attribut + !isRepresentative → "Variante sans attribut"
 *
 * Pour un aria-label lu par lecteur d'écran, utiliser `getVariantDisplayTitleSpoken()`.
 */
export function getVariantDisplayTitle(variant: VariantLikeForTitle): string {
	const label = buildVariantLabel(variant);
	if (label) return label;
	return variant.isRepresentative ? "Variante principale" : "Variante sans attribut";
}

/**
 * Variante « parlée » du titre, pour les `aria-label` des lecteurs d'écran :
 * " · " → ", ".
 */
export function getVariantDisplayTitleSpoken(variant: VariantLikeForTitle): string {
	return getVariantDisplayTitle(variant).replace(/ · /g, ", ");
}

/**
 * Label compact d'une variante en joignant ses attributs non vides — chaîne
 * VIDE si la variante n'en porte aucun (c'est `getVariantDisplayTitle` qui
 * décide alors du repli affichable).
 *
 * @example
 * buildVariantLabel({ color: { name: "Or rose" }, material: { name: "Acier" }, size: "M" })
 * // → "Or rose · Acier · M"
 */
export function buildVariantLabel(variant: VariantLikeForTitle): string {
	const parts: string[] = [];
	if (variant.color?.name.trim()) parts.push(variant.color.name);
	if (variant.material?.name.trim()) parts.push(variant.material.name);
	const size = variant.size?.trim();
	if (size) parts.push(size);
	return parts.join(" · ");
}
