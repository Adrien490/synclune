import type { Product } from "@/modules/products/types/product.types";
import { getPrimaryImageForList } from "@/modules/products/services/product-display.service";
import { slugify } from "@/shared/utils/generate-slug";

// ============================================================================
// Types
// ============================================================================

export type ColorOption = { slug: string; hex: string; name: string };
export type MaterialOption = { slug: string; name: string };
export type ActiveSku = NonNullable<Product["skus"]>[number];

export interface ImageSelection {
	url: string;
	alt: string;
	blurDataUrl: string | null;
}

export interface AvailabilityMaps {
	color: Map<string, boolean>;
	material: Map<string, boolean>;
	size: Map<string, boolean>;
}

// ============================================================================
// Constants
// ============================================================================

/** ID for aria-describedby on validation errors */
export const VALIDATION_ERROR_ID = "sku-selector-validation-error";

/** ID for aria-describedby on quantity input bounds */
export const QUANTITY_BOUNDS_ID = "sku-selector-quantity-bounds";

/** IDs for aria-labelledby on radiogroup containers */
export const COLOR_LEGEND_ID = "sku-color-legend";
export const MATERIAL_LEGEND_ID = "sku-material-legend";
export const SIZE_LEGEND_ID = "sku-size-legend";

export const SKU_SELECTOR_DIALOG_ID = "sku-selector";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts unique color, material, and size options from active SKUs.
 * Shared between form initialization (useEffect) and render to avoid duplication.
 */
export function extractVariantOptions(activeSkus: ActiveSku[]) {
	const uniqueColors = new Map<string, ColorOption>();
	const uniqueMaterials = new Map<string, MaterialOption>();
	const uniqueSizes = new Set<string>();

	for (const sku of activeSkus) {
		if (sku.color?.slug && sku.color.hex) {
			if (!uniqueColors.has(sku.color.slug)) {
				uniqueColors.set(sku.color.slug, {
					slug: sku.color.slug,
					hex: sku.color.hex,
					name: sku.color.name,
				});
			}
		}
		if (sku.material?.name) {
			const slug = slugify(sku.material.name);
			if (!uniqueMaterials.has(slug)) {
				uniqueMaterials.set(slug, { slug, name: sku.material.name });
			}
		}
		if (sku.size) {
			uniqueSizes.add(sku.size);
		}
	}

	return {
		colors: Array.from(uniqueColors.values()),
		materials: Array.from(uniqueMaterials.values()),
		sizes: Array.from(uniqueSizes),
	};
}

/**
 * Builds availability maps in a single pass over active SKUs.
 * Each map indicates whether a given option has at least one compatible SKU in stock.
 */
export function buildAvailabilityMaps(
	activeSkus: ActiveSku[],
	colors: ColorOption[],
	materials: MaterialOption[],
	sizes: string[],
	selectedColor: string,
	selectedMaterial: string,
	selectedSize: string,
): AvailabilityMaps {
	const colorMap = new Map<string, boolean>(colors.map((c) => [c.slug, false]));
	const materialMap = new Map<string, boolean>(materials.map((m) => [m.slug, false]));
	const sizeMap = new Map<string, boolean>(sizes.map((s) => [s, false]));

	for (const sku of activeSkus) {
		if (sku.inventory <= 0) continue;

		const skuColor = sku.color?.slug;
		const skuMaterial = sku.material?.name ? slugify(sku.material.name) : null;
		const skuSize = sku.size;

		// Color availability: matches selected material + size
		if (skuColor && colorMap.has(skuColor) && !colorMap.get(skuColor)) {
			const materialMatch = !selectedMaterial || skuMaterial === selectedMaterial;
			const sizeMatch = !selectedSize || skuSize === selectedSize;
			if (materialMatch && sizeMatch) {
				colorMap.set(skuColor, true);
			}
		}

		// Material availability: matches selected color + size
		if (skuMaterial && materialMap.has(skuMaterial) && !materialMap.get(skuMaterial)) {
			const colorMatch = !selectedColor || skuColor === selectedColor;
			const sizeMatch = !selectedSize || skuSize === selectedSize;
			if (colorMatch && sizeMatch) {
				materialMap.set(skuMaterial, true);
			}
		}

		// Size availability: matches selected color + material
		if (skuSize && sizeMap.has(skuSize) && !sizeMap.get(skuSize)) {
			const colorMatch = !selectedColor || skuColor === selectedColor;
			const materialMatch = !selectedMaterial || skuMaterial === selectedMaterial;
			if (colorMatch && materialMatch) {
				sizeMap.set(skuSize, true);
			}
		}
	}

	return { color: colorMap, material: materialMap, size: sizeMap };
}

/**
 * Returns the image to display based on the selected color.
 */
export function getImageForColor(
	selectedColor: string,
	activeSkus: ActiveSku[],
	product: Product,
): ImageSelection {
	if (selectedColor) {
		const skuWithColor = activeSkus.find(
			(sku) => sku.color?.slug === selectedColor && sku.images.length > 0,
		);
		if (skuWithColor?.images.length) {
			const img = skuWithColor.images.find((i) => i.isPrimary) ?? skuWithColor.images[0];
			if (!img) return { url: "", alt: "", blurDataUrl: null };
			return {
				url: img.url,
				alt: img.altText ?? `${product.title} - ${selectedColor}`,
				blurDataUrl: img.blurDataUrl ?? null,
			};
		}
	}
	const primaryImage = getPrimaryImageForList(product);
	return {
		url: primaryImage.url,
		alt: primaryImage.alt ?? product.title,
		blurDataUrl: primaryImage.blurDataUrl ?? null,
	};
}

/**
 * Computes validation errors based on required selections.
 */
export function computeValidationErrors(
	colors: ColorOption[],
	materials: MaterialOption[],
	sizes: string[],
	requiresSize: boolean,
	selectedColor: string,
	selectedMaterial: string,
	selectedSize: string,
): string[] {
	const errors: string[] = [];
	if (colors.length > 1 && !selectedColor) {
		errors.push("Veuillez sélectionner une couleur");
	}
	if (materials.length > 1 && !selectedMaterial) {
		errors.push("Veuillez sélectionner un matériau");
	}
	if (requiresSize && sizes.length > 0 && !selectedSize) {
		errors.push("Veuillez sélectionner une taille");
	}
	return errors;
}
