/**
 * Services d'affichage des variantes de produits — schéma lean (lot 2) :
 * une variante porte UNE couleur et UN matériau (FK nullables), le prix
 * effectif est `variant.priceCents ?? product.priceCents`, et l'identité URL
 * d'une couleur est son NOM slugifié.
 */

import type { ProductFromList, ColorSwatch } from "@/modules/products/types/product-list.types";
import { getPrimaryVariantForList } from "@/modules/variants/services/variant-selection.service";
import { slugify } from "@/shared/utils/generate-slug";

// ============================================================================
// PRODUCT VARIANT DISPLAY SERVICE
// Pure functions for extracting and displaying product variant information
// ============================================================================

/**
 * Récupère la couleur principale de la variante principale
 */
export function getPrimaryColorForList(product: ProductFromList): {
	hex?: string;
	name?: string;
} {
	const primaryVariant = getPrimaryVariantForList(product);
	if (!primaryVariant) return {};

	const fallbackName = primaryVariant.material?.name ?? undefined;

	const primaryColor = primaryVariant.color;
	if (primaryColor?.hex) {
		return {
			hex: primaryColor.hex,
			name: primaryColor.name || fallbackName,
		};
	}

	return fallbackName ? { name: fallbackName } : {};
}

/**
 * Extrait les couleurs disponibles pour les pastilles sur ProductCard
 * Retourne un tableau de ColorSwatch avec info stock
 *
 * @description
 * **Comportement intentionnel du stock par couleur :**
 * Une couleur est marquée `inStock: true` si AU MOINS UNE variante de cette couleur
 * a du stock (ex: "Rouge taille 52" en stock même si "Rouge taille 54" est épuisé).
 *
 * Cela permet à l'utilisateur de voir que la couleur existe et est potentiellement
 * disponible, même si certaines tailles/matériaux sont épuisés.
 */
export function getAvailableColorsForList(product: ProductFromList): ColorSwatch[] {
	const activeVariants = product.variants.filter((variant) => variant.active && variant.color);
	const colorMap = new Map<string, ColorSwatch>();

	for (const variant of activeVariants) {
		const c = variant.color;
		if (!c?.hex) continue;
		const slug = slugify(c.name);
		const existing = colorMap.get(slug);
		// Logique permissive : inStock = true si au moins une variante active
		// portant cette couleur a du stock (cohérent JSDoc ci-dessus).
		const inStock = existing?.inStock === true || variant.stock > 0;
		colorMap.set(slug, {
			slug,
			hex: c.hex,
			name: c.name,
			inStock,
		});
	}

	return Array.from(colorMap.values());
}

/**
 * Compte les variantes disponibles
 */
export function getVariantCountForList(product: ProductFromList): {
	colors: number;
	materials: number;
	sizes: number;
	total: number;
} {
	const uniqueColors = new Set<string>();
	const uniqueMaterials = new Set<string>();
	const uniqueSizes = new Set<string>();
	let totalVariants = 0;

	// Variantes actives en stock
	const activeVariants = product.variants.filter((variant) => variant.active && variant.stock > 0);

	for (const variant of activeVariants) {
		if (variant.color?.hex) uniqueColors.add(variant.color.hex);
		if (variant.material) uniqueMaterials.add(variant.material.name);
		if (variant.size) uniqueSizes.add(variant.size);
		totalVariants++;
	}

	return {
		colors: uniqueColors.size,
		materials: uniqueMaterials.size,
		sizes: uniqueSizes.size,
		total: totalVariants,
	};
}

/**
 * Vérifie si un produit a plusieurs variantes nécessitant une sélection
 * Retourne true si le produit a plus d'une couleur, matière OU taille
 */
export function hasMultipleVariants(product: ProductFromList): boolean {
	const activeVariants = product.variants.filter((variant) => variant.active);
	if (activeVariants.length <= 1) return false;

	const uniqueColors = new Set(
		activeVariants.map((v) => v.color?.name).filter((n): n is string => Boolean(n)),
	);
	const uniqueMaterials = new Set(
		activeVariants.map((v) => v.material?.name).filter((n): n is string => Boolean(n)),
	);
	const uniqueSizes = new Set(activeVariants.map((v) => v.size).filter(Boolean));

	return uniqueColors.size > 1 || uniqueMaterials.size > 1 || uniqueSizes.size > 1;
}

/**
 * Récupère les informations de prix min/max pour une plage — prix effectif
 * (override variante ?? prix produit).
 */
export function getPriceRangeForList(product: ProductFromList): {
	min: number;
	max: number;
	hasRange: boolean;
} {
	const prices: number[] = [];

	// Variantes actives en stock
	const activeVariants = product.variants.filter((variant) => variant.active && variant.stock > 0);

	for (const variant of activeVariants) {
		prices.push(variant.priceCents ?? product.priceCents);
	}

	if (prices.length === 0) {
		return {
			min: product.priceCents,
			max: product.priceCents,
			hasRange: false,
		};
	}

	const min = Math.min(...prices);
	const max = Math.max(...prices);

	return {
		min,
		max,
		hasRange: min !== max,
	};
}
