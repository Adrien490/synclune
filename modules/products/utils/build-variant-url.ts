import { slugify } from "@/shared/utils/generate-slug";

import type { VariantFromList } from "@/modules/products/types/product-list.types";

/**
 * Build a product detail page URL preselecting a specific variant via query
 * params — schéma lean : une variante porte UNE couleur et UN matériau,
 * l'identité URL de la couleur est son NOM slugifié.
 *
 * @example
 * buildVariantUrl("/creations/bague-lune", { color: { name: "Or", hex: "#FFD700", id: "…" }, material: null, size: "52" })
 * // => "/creations/bague-lune?color=or&size=52"
 */
export function buildVariantUrl(
	baseUrl: string,
	variant: Pick<VariantFromList, "color" | "material" | "size">,
): string {
	const params = new URLSearchParams();
	if (variant.color?.name) params.set("color", slugify(variant.color.name));
	if (variant.material?.name) params.set("material", slugify(variant.material.name));
	if (variant.size) params.set("size", variant.size);
	const qs = params.toString();
	return qs ? `${baseUrl}?${qs}` : baseUrl;
}
