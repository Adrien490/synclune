/**
 * Helper d'affichage pour construire le label compact d'une variante (SKU) :
 * couleurs · matériaux · taille.
 *
 * Typage structurel volontaire (pas d'import de `ProductSku`) pour éviter une
 * dépendance circulaire skus <-> products et rester réutilisable partout où la
 * forme minimale est disponible.
 */

import { getSkuMaterialsLabel } from "./sku-materials-label";

type SkuVariantLabelInput = {
	colors: readonly { color: { name: string } }[];
	materials: readonly { material: { name: string } }[] | null | undefined;
	size: string | null;
};

/**
 * Construit le label lisible d'une variante en joignant ses attributs.
 *
 * @example
 * buildVariantLabel({ colors: [{ color: { name: "Or rose" } }], materials: [{ material: { name: "Acier" } }], size: "M" })
 * // → "Or rose · Acier · M"
 *
 * @returns Le label joint par " · ", ou chaîne vide si aucun attribut.
 */
export function buildVariantLabel(sku: SkuVariantLabelInput): string {
	const parts: string[] = [];
	const colorsLabel = sku.colors.map((c) => c.color.name).join(" + ");
	if (colorsLabel) parts.push(colorsLabel);
	const materialsLabel = getSkuMaterialsLabel(sku.materials);
	if (materialsLabel) parts.push(materialsLabel);
	if (sku.size) parts.push(sku.size);
	return parts.join(" · ");
}
