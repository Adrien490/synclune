/**
 * Label compact d'une variante : couleur · matériau · taille.
 *
 * Typage structurel volontaire (pas d'import de types Prisma) pour éviter une
 * dépendance circulaire variants <-> products.
 */

type VariantVariantLabelInput = {
	color: { name: string } | null;
	material: { name: string } | null;
	size: string | null;
};

/**
 * Construit le label lisible d'une variante en joignant ses attributs non nuls.
 *
 * @example
 * buildVariantLabel({ color: { name: "Or rose" }, material: { name: "Acier" }, size: "M" })
 * // → "Or rose · Acier · M"
 */
export function buildVariantLabel(variant: VariantVariantLabelInput): string {
	const parts: string[] = [];
	if (variant.color?.name) parts.push(variant.color.name);
	if (variant.material?.name) parts.push(variant.material.name);
	if (variant.size) parts.push(variant.size);
	return parts.join(" · ");
}
