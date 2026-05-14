import { slugify } from "@/shared/utils/generate-slug";

import type { SkuFromList } from "@/modules/products/types/product-list.types";
import { getPrimaryMaterialName } from "@/modules/skus/utils/sku-materials-label";

/**
 * Build a product detail page URL preselecting a specific SKU via query params.
 *
 * The canonical PDP URL contract is `?color=slug&material=slug&size=value` —
 * any absent SKU field is omitted from the query string. Le matériau retenu
 * est le matériau principal (position=0) du SKU en M2M.
 *
 * @example
 * buildSkuUrl("/creations/bague-lune", { color: { slug: "or" }, materials: [], size: "52" })
 * // => "/creations/bague-lune?color=or&size=52"
 */
export function buildSkuUrl(
	baseUrl: string,
	sku: Pick<SkuFromList, "color" | "materials" | "size">,
): string {
	const params = new URLSearchParams();
	if (sku.color?.slug) params.set("color", sku.color.slug);
	const primaryMaterial = getPrimaryMaterialName(sku.materials);
	if (primaryMaterial) params.set("material", slugify(primaryMaterial));
	if (sku.size) params.set("size", sku.size);
	const qs = params.toString();
	return qs ? `${baseUrl}?${qs}` : baseUrl;
}
