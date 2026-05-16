/**
 * Services d'affichage des variantes de produits
 *
 * Ce module contient les fonctions pour :
 * - Extraire les couleurs disponibles pour les pastilles
 * - Compter les variantes (couleurs, matériaux, tailles)
 * - Détecter si un produit a plusieurs variantes
 * - Calculer la plage de prix
 */

import type { ProductFromList, ColorSwatch } from "@/modules/products/types/product-list.types";
import { getPrimarySkuForList } from "@/modules/skus/services/sku-selection.service";
import { getPrimaryMaterialName } from "@/modules/skus/utils/sku-materials-label";

// ============================================================================
// PRODUCT VARIANT DISPLAY SERVICE
// Pure functions for extracting and displaying product variant information
// ============================================================================

/**
 * Récupère la couleur principale du SKU principal
 */
export function getPrimaryColorForList(product: ProductFromList): {
	hex?: string;
	name?: string;
} {
	const primarySku = getPrimarySkuForList(product);
	if (!primarySku) return {};

	const fallbackName = getPrimaryMaterialName(primarySku.materials) ?? undefined;

	const primaryColor = primarySku.colors[0]?.color;
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
 * Cela permet à l'utilisateur de voir que la couleur existe et est potentiellement disponible,
 * même si certaines tailles/matériaux sont épuisés. Le SkuSelectorDialog affichera ensuite
 * les variantes exactes disponibles.
 *
 * **Alternative non retenue :** Marquer la couleur en rupture si TOUTES les variantes sont épuisées.
 * Rejeté car cela masquerait des couleurs partiellement disponibles.
 */
export function getAvailableColorsForList(product: ProductFromList): ColorSwatch[] {
	const activeSkus = product.skus.filter((sku) => sku.isActive && sku.colors.length > 0);
	const colorMap = new Map<string, ColorSwatch>();

	for (const sku of activeSkus) {
		// M2M : on agrège chaque couleur unique vue dans les SKUs.
		for (const link of sku.colors) {
			const c = link.color;
			if (!c.slug || !c.hex) continue;
			const existing = colorMap.get(c.slug);
			// Logique permissive : inStock = true si au moins un SKU actif portant
			// cette couleur a du stock (cohérent JSDoc ci-dessus).
			const inStock = existing?.inStock === true || sku.inventory > 0;
			colorMap.set(c.slug, {
				slug: c.slug,
				hex: c.hex,
				name: c.name,
				inStock,
			});
		}
	}

	return Array.from(colorMap.values());
}

/**
 * Compte les variantes disponibles (inclut defaultSku)
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
	let totalSkus = 0;

	// Ajouter les SKUs actifs en stock
	const activeSkus = product.skus.filter((sku) => sku.isActive && sku.inventory > 0);

	for (const sku of activeSkus) {
		for (const link of sku.colors) {
			if (link.color.hex) uniqueColors.add(link.color.hex);
		}
		for (const entry of sku.materials) {
			uniqueMaterials.add(entry.material.name);
		}
		if (sku.size) uniqueSizes.add(sku.size);
		totalSkus++;
	}

	return {
		colors: uniqueColors.size,
		materials: uniqueMaterials.size,
		sizes: uniqueSizes.size,
		total: totalSkus,
	};
}

/**
 * Vérifie si un produit a plusieurs variantes nécessitant une sélection
 * Retourne true si le produit a plus d'une couleur, matière OU taille
 */
export function hasMultipleVariants(product: ProductFromList): boolean {
	const activeSkus = product.skus.filter((sku) => sku.isActive);
	if (activeSkus.length <= 1) return false;

	const uniqueColors = new Set(
		activeSkus.flatMap((s) => s.colors.map((c) => c.color.slug).filter(Boolean)),
	);
	const uniqueMaterials = new Set(
		activeSkus.flatMap((s) => s.materials.map((m) => m.material.name)),
	);
	const uniqueSizes = new Set(activeSkus.map((s) => s.size).filter(Boolean));

	return uniqueColors.size > 1 || uniqueMaterials.size > 1 || uniqueSizes.size > 1;
}

/**
 * Récupère les informations de prix min/max pour une plage (inclut defaultSku)
 */
export function getPriceRangeForList(product: ProductFromList): {
	min: number;
	max: number;
	hasRange: boolean;
} {
	const prices: number[] = [];

	// Ajouter les prix des SKUs actifs en stock
	const activeSkus = product.skus.filter((sku) => sku.isActive && sku.inventory > 0);

	for (const sku of activeSkus) {
		prices.push(sku.priceInclTax);
	}

	if (prices.length === 0) {
		return {
			min: 0,
			max: 0,
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
