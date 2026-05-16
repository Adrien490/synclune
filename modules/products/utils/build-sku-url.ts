import { slugify } from "@/shared/utils/generate-slug";

import type { SkuFromList } from "@/modules/products/types/product-list.types";
import { getPrimaryMaterialName } from "@/modules/skus/utils/sku-materials-label";

/**
 * Build a product detail page URL preselecting a specific SKU via query params.
 *
 * Le slug couleur retenu est celui de la couleur principale (position=0) du SKU
 * en M2M ; côté PDP, ce slug suffit pour resélectionner la même variante car le
 * filtre couleur est tolérant (un slug match si UNE des couleurs du SKU match).
 *
 * @example
 * buildSkuUrl("/creations/bague-lune", { colors: [{ color: { slug: "or" } }], materials: [], size: "52" })
 * // => "/creations/bague-lune?color=or&size=52"
 */
export function buildSkuUrl(
	baseUrl: string,
	sku: Pick<SkuFromList, "colors" | "materials" | "size">,
): string {
	const params = new URLSearchParams();
	const primaryColorSlug = sku.colors[0]?.color.slug;
	if (primaryColorSlug) params.set("color", primaryColorSlug);
	const primaryMaterial = getPrimaryMaterialName(sku.materials);
	if (primaryMaterial) params.set("material", slugify(primaryMaterial));
	if (sku.size) params.set("size", sku.size);
	const qs = params.toString();
	return qs ? `${baseUrl}?${qs}` : baseUrl;
}
