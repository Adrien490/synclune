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
 * - 1+ attributs → join par " · " (parité séparateur snapshot facture)
 * - Aucun attribut + isDefault → "Variante principale"
 * - Aucun attribut + !isDefault → "Variante sans attribut"
 */
export function getSkuDisplayTitle(sku: SkuLikeForTitle): string {
	const parts: string[] = [];
	const colorsLabel = getSkuColorsDisplayLabel(sku.colors ?? null);
	if (colorsLabel) parts.push(colorsLabel);
	const materialsLabel = getSkuMaterialsLabel(sku.materials ?? null);
	if (materialsLabel) parts.push(materialsLabel);
	const size = sku.size?.trim();
	if (size) parts.push(size);

	if (parts.length > 0) return parts.join(" · ");
	return sku.isDefault ? "Variante principale" : "Variante sans attribut";
}
