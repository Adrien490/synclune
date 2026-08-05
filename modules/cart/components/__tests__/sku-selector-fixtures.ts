import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import type { GetCartReturn } from "@/modules/cart/types/cart.types";
import type { ActiveSku } from "../sku-selector-utils";

/**
 * Fixtures du sélecteur de variante — calquées sur « Bague Fleur de Cristal » du
 * seed : trois pièces réelles (Cristal/52, Cristal/54, Émeraude/54), la combinaison
 * exacte qui laissait partir une 52 sans que la cliente ait vu une seule taille.
 */

export function makeSku(overrides: Partial<ActiveSku> & { id: string }): ActiveSku {
	return {
		priceInclTax: 5490,
		compareAtPrice: null,
		inventory: 12,
		isActive: true,
		isDefault: false,
		colors: [],
		materials: [],
		size: null,
		images: [],
		...overrides,
	} as unknown as ActiveSku;
}

export function makeColorLink(slug: string, name: string, hex = "#E8F4F8") {
	return { colorId: `c-${slug}`, position: 0, color: { id: `c-${slug}`, slug, name, hex } };
}

export function makeMaterialLink(name: string) {
	return { materialId: `m-${name}`, position: 0, material: { id: `m-${name}`, name } };
}

export function makeProduct(overrides: Partial<ProductCarouselItem> = {}): ProductCarouselItem {
	return {
		id: "p-1",
		slug: "bague-fleur-de-cristal",
		title: "Bague Fleur de Cristal",
		status: "PUBLIC",
		createdAt: new Date("2026-01-01"),
		type: { id: "t-1", slug: "bagues", label: "Bagues" },
		skus: [
			makeSku({
				id: "sku-cristal-52",
				isDefault: true,
				colors: [makeColorLink("cristal", "Cristal")],
				size: "52",
			}),
			makeSku({
				id: "sku-cristal-54",
				inventory: 10,
				colors: [makeColorLink("cristal", "Cristal")],
				size: "54",
			}),
			makeSku({
				id: "sku-emeraude-54",
				priceInclTax: 5990,
				inventory: 2,
				colors: [makeColorLink("emeraude", "Émeraude", "#50C878")],
				size: "54",
			}),
		],
		...overrides,
	} as unknown as ProductCarouselItem;
}

export function makeCart(items: { skuId: string; quantity: number }[] = []): GetCartReturn {
	return {
		items: items.map((item) => ({ sku: { id: item.skuId }, quantity: item.quantity })),
	} as unknown as GetCartReturn;
}
