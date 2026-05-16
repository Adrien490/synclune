import { getSkuColorsDisplayLabel } from "./sku-colors-label";
import { getSkuMaterialsLabel } from "./sku-materials-label";

type SkuColorEntry = { color: { name: string } };
type SkuMaterialEntry = { material: { name: string } };

interface SkuLikeForTitle {
	colors?: readonly SkuColorEntry[] | null;
	materials?: readonly SkuMaterialEntry[] | null;
	size?: string | null;
	isDefault?: boolean;
}

/**
 * Construit un titre lisible pour une variante SKU à partir de ses attributs
 * (couleur · matériau · taille). Évite l'affichage de la référence SKU technique
 * comme titre principal côté UI mobile/cards.
 *
 * Hiérarchie de séparateurs (volontaire, parité snapshot facture) :
 *  - " + " interne couleurs bicolores (via getSkuColorsDisplayLabel)
 *  - ", " interne matériaux composites (via getSkuMaterialsLabel)
 *  - " · " entre dimensions
 *
 * @example
 * getSkuDisplayTitle({
 *   colors: [{ color: { name: "Or rose" } }, { color: { name: "Argent" } }],
 *   materials: [{ material: { name: "Verre" } }, { material: { name: "Acier" } }],
 *   size: "52mm",
 * }) // → "Or rose + Argent · Verre, Acier · 52mm"
 *
 * - 1+ attributs → join par " · "
 * - Aucun attribut + isDefault → "Variante principale"
 * - Aucun attribut + !isDefault → "Variante sans attribut"
 *
 * Pour un aria-label lu par screen reader, utiliser `getSkuDisplayTitleSpoken()`.
 */
export function getSkuDisplayTitle(sku: SkuLikeForTitle): string {
	const parts: string[] = [];
	const colorsLabel = getSkuColorsDisplayLabel(sku.colors ?? null);
	if (colorsLabel && colorsLabel.trim()) parts.push(colorsLabel);
	const materialsLabel = getSkuMaterialsLabel(sku.materials ?? null);
	if (materialsLabel && materialsLabel.trim()) parts.push(materialsLabel);
	const size = sku.size?.trim();
	if (size) parts.push(size);

	if (parts.length > 0) return parts.join(" · ");
	return sku.isDefault ? "Variante principale" : "Variante sans attribut";
}

/**
 * Variante "parlée" du titre, destinée aux `aria-label` lus par les screen readers.
 * Remplace les séparateurs symboliques par des liaisons FR naturelles :
 *  - " + " (couleurs bicolores) → " et "
 *  - " · " (séparation dimensions) → ", "
 *  - ", " (matériaux composites) → conservé (déjà naturel)
 *
 * @example
 * // visuel : "Or rose + Argent · Verre, Acier · 52mm"
 * // parlé  : "Or rose et Argent, Verre, Acier, 52mm"
 */
export function getSkuDisplayTitleSpoken(sku: SkuLikeForTitle): string {
	return getSkuDisplayTitle(sku).replace(/ · /g, ", ").replace(/ \+ /g, " et ");
}
