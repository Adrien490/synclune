import { slugify } from "@/shared/utils/generate-slug";

import type { SkuFromList } from "@/modules/products/types/product-list.types";

/**
 * Build a product detail page URL preselecting a specific SKU via query params.
 *
 * The canonical PDP URL contract is `?color=slug&material=slug&size=value` —
 * any absent SKU field is omitted from the query string.
 *
 * @example
 * buildSkuUrl("/creations/bague-lune", { color: { slug: "or" }, material: null, size: "52" })
 * // => "/creations/bague-lune?color=or&size=52"
 */
export function buildSkuUrl(
	baseUrl: string,
	sku: Pick<SkuFromList, "color" | "material" | "size">,
): string {
	const params = new URLSearchParams();
	if (sku.color?.slug) params.set("color", sku.color.slug);
	if (sku.material?.name) params.set("material", slugify(sku.material.name));
	if (sku.size) params.set("size", sku.size);
	const qs = params.toString();
	return qs ? `${baseUrl}?${qs}` : baseUrl;
}
