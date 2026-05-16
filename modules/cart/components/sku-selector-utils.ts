import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import { getPrimaryImageForList } from "@/modules/products/services/product-display.service";
import { slugify } from "@/shared/utils/generate-slug";

// ============================================================================
// Types
// ============================================================================

export type ColorOption = { slug: string; hex: string; name: string };
export type MaterialOption = { slug: string; name: string };
export type ActiveSku = NonNullable<ProductCarouselItem["skus"]>[number];

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
		// Couleurs M2M : on agrège chaque couleur unique (la pastille split est gérée
		// ailleurs ; ici on liste les teintes disponibles à filtrer).
		for (const link of sku.colors ?? []) {
			const c = link.color;
			if (!c.slug || !c.hex) continue;
			if (!uniqueColors.has(c.slug)) {
				uniqueColors.set(c.slug, { slug: c.slug, hex: c.hex, name: c.name });
			}
		}
		// Matériaux M2M : un SKU peut en avoir plusieurs (cap 3, ordre = priorité)
		for (const link of sku.materials ?? []) {
			const name = link.material.name;
			if (!name) continue;
			const slug = slugify(name);
			if (!uniqueMaterials.has(slug)) {
				uniqueMaterials.set(slug, { slug, name });
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

		// M2M : un SKU « contient » une couleur si son slug est dans sa liste
		const skuColorSlugs = (sku.colors ?? [])
			.map((link) => link.color.slug)
			.filter((s): s is string => Boolean(s));
		const skuMaterialSlugs = (sku.materials ?? [])
			.map((link) => (link.material.name ? slugify(link.material.name) : null))
			.filter((s): s is string => s !== null);
		const skuSize = sku.size;
		const skuContainsSelectedColor = !selectedColor || skuColorSlugs.includes(selectedColor);
		const skuContainsSelectedMaterial =
			!selectedMaterial || skuMaterialSlugs.includes(selectedMaterial);

		// Color availability: chaque couleur du SKU est dispo si matériau + taille sélectionnés correspondent
		for (const skuColor of skuColorSlugs) {
			if (!colorMap.has(skuColor) || colorMap.get(skuColor)) continue;
			const sizeMatch = !selectedSize || skuSize === selectedSize;
			if (skuContainsSelectedMaterial && sizeMatch) {
				colorMap.set(skuColor, true);
			}
		}

		// Material availability: chaque matériau du SKU est dispo si couleur + taille sélectionnés correspondent
		for (const skuMaterial of skuMaterialSlugs) {
			if (!materialMap.has(skuMaterial) || materialMap.get(skuMaterial)) continue;
			const sizeMatch = !selectedSize || skuSize === selectedSize;
			if (skuContainsSelectedColor && sizeMatch) {
				materialMap.set(skuMaterial, true);
			}
		}

		// Size availability: matches selected color + material
		if (skuSize && sizeMap.has(skuSize) && !sizeMap.get(skuSize)) {
			if (skuContainsSelectedColor && skuContainsSelectedMaterial) {
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
	product: ProductCarouselItem,
): ImageSelection {
	if (selectedColor) {
		const skuWithColor = activeSkus.find(
			(sku) =>
				(sku.colors ?? []).some((c) => c.color.slug === selectedColor) && sku.images.length > 0,
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
