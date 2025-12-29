/**
 * Services de sélection et calcul de stock des SKUs
 *
 * Ce module contient la logique métier pour :
 * - Sélectionner le SKU principal d'un produit
 * - Sélectionner un SKU par couleur
 * - Calculer les informations de stock
 * - Extraire les variantes uniques
 * - Initialiser les formulaires de sélection
 *
 * NOTE: Ce service utilise des types génériques avec BaseProductForList/BaseSkuForList
 * pour éviter une dépendance circulaire avec le module products.
 */

import type {
	BaseProductForList,
	BaseSkuForList,
	BaseProductSku,
	StockStatus,
	ProductStockInfo,
} from "@/shared/types/product-sku.types";
import { slugify } from "@/shared/utils/generate-slug";
import { PRODUCT_TYPES_REQUIRING_SIZE } from "@/modules/products/constants/product-texts.constants";

/**
 * Calcule les informations de stock à partir d'un tableau de SKUs.
 * Fonction utilitaire générique pour tout contexte (produits, related, cart).
 *
 * @param skus - Tableau de SKUs avec au minimum { inventory: number }
 * @returns Infos stock formatées pour ProductCard
 */
export function computeStockFromSkus<T extends { inventory: number }>(
	skus: T[]
): ProductStockInfo {
	const totalInventory = skus.reduce((sum, sku) => sum + sku.inventory, 0);
	const availableSkus = skus.filter((sku) => sku.inventory > 0).length;

	let status: StockStatus;
	let message: string;

	if (totalInventory === 0) {
		status = "out_of_stock";
		message = "Rupture de stock";
	} else {
		status = "in_stock";
		message = "En stock";
	}

	return {
		status,
		totalInventory,
		availableSkus,
		message,
	};
}

/**
 * Récupère le SKU principal pour les listes (logique de sélection intelligente)
 *
 * Ordre de priorité :
 * 1. SKU avec isDefault = true et actif
 * 2. Premier SKU en stock, trié par prix croissant
 * 3. Premier SKU actif
 * 4. Premier SKU (fallback)
 */
export function getPrimarySkuForList<
	TSku extends BaseSkuForList,
	TProduct extends { skus?: TSku[] | null }
>(product: TProduct): TSku | null {
	if (!product.skus || product.skus.length === 0) {
		return null;
	}

	// 1. SKU avec isDefault = true
	const defaultFlagSku = product.skus.find(
		(sku) => sku.isActive && sku.isDefault
	);
	if (defaultFlagSku) return defaultFlagSku;

	// 2. SKU en stock, trié par priceInclTax ASC
	const inStockSkus = product.skus
		.filter((sku) => sku.isActive && sku.inventory > 0)
		.sort((a, b) => a.priceInclTax - b.priceInclTax);

	if (inStockSkus.length > 0) return inStockSkus[0];

	// 3. Premier SKU actif
	const activeSku = product.skus.find((sku) => sku.isActive);
	return activeSku || product.skus[0];
}

/**
 * Récupère le SKU correspondant à une couleur sélectionnée
 * Fallback sur le SKU principal si la couleur n'existe pas ou n'est pas active
 *
 * @param product - Produit avec ses SKUs
 * @param colorSlug - Slug de la couleur sélectionnée (ou null)
 * @returns SKU correspondant ou SKU principal en fallback
 */
export function getSkuByColorForList<
	TSku extends BaseSkuForList,
	TProduct extends { skus?: TSku[] | null }
>(product: TProduct, colorSlug: string | null): TSku | null {
	if (!colorSlug || !product.skus) {
		return getPrimarySkuForList(product);
	}

	const skuWithColor = product.skus.find(
		(sku) => sku.color?.slug === colorSlug && sku.isActive
	);

	return skuWithColor ?? getPrimarySkuForList(product);
}

/**
 * Récupère les informations de stock du produit
 */
export function getStockInfoForList<
	TSku extends BaseSkuForList,
	TProduct extends { skus?: TSku[] | null }
>(product: TProduct): ProductStockInfo {
	const activeSkus = product.skus?.filter((sku) => sku.isActive) || [];
	const totalInventory = activeSkus.reduce((sum, sku) => sum + sku.inventory, 0);
	const availableSkus = activeSkus.filter((sku) => sku.inventory > 0).length;

	let status: StockStatus;
	let message: string;

	// Système simplifié : en stock ou rupture de stock
	if (totalInventory === 0) {
		status = "out_of_stock";
		message = "Rupture de stock";
	} else {
		status = "in_stock";
		message = "En stock";
	}

	return {
		status,
		totalInventory,
		availableSkus,
		message,
	};
}

// ============================================================================
// EXTRACTION DE VARIANTES
// ============================================================================

/** Couleur unique extraite */
export type UniqueColor = {
	slug: string;
	hex: string;
	name: string;
};

/** Matériau unique extrait */
export type UniqueMaterial = {
	slug: string;
	name: string;
};

/** Résultat de l'extraction des variantes uniques */
export type ExtractedVariants = {
	colors: UniqueColor[];
	materials: UniqueMaterial[];
	sizes: string[];
};

/**
 * Extrait les variantes uniques (couleurs, matériaux, tailles) d'un tableau de SKUs actifs
 *
 * @param activeSkus - SKUs actifs du produit
 * @returns Variantes uniques groupées par type
 */
export function extractUniqueVariants<
	TSku extends BaseSkuForList & { size?: string | null }
>(activeSkus: TSku[]): ExtractedVariants {
	// Couleurs uniques
	const uniqueColors = new Map<string, UniqueColor>();
	for (const sku of activeSkus) {
		if (sku.color?.slug && sku.color?.hex) {
			if (!uniqueColors.has(sku.color.slug)) {
				uniqueColors.set(sku.color.slug, {
					slug: sku.color.slug,
					hex: sku.color.hex,
					name: sku.color.name,
				});
			}
		}
	}

	// Matériaux uniques
	const uniqueMaterials = new Map<string, UniqueMaterial>();
	for (const sku of activeSkus) {
		if (sku.material?.name) {
			const slug = slugify(sku.material.name);
			if (!uniqueMaterials.has(slug)) {
				uniqueMaterials.set(slug, {
					slug,
					name: sku.material.name,
				});
			}
		}
	}

	// Tailles uniques
	const uniqueSizes = new Set<string>();
	for (const sku of activeSkus) {
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
 * Vérifie si un produit a plusieurs variantes actives
 *
 * @param product - Produit avec ses SKUs
 * @returns true si le produit a plus d'un SKU actif
 */
export function hasMultipleActiveVariants<
	TSku extends BaseSkuForList,
	TProduct extends { skus?: TSku[] | null }
>(product: TProduct): boolean {
	const activeSkusCount = product.skus?.filter((s) => s.isActive).length ?? 0;
	return activeSkusCount > 1;
}

// ============================================================================
// LOGIQUE DE TAILLE
// ============================================================================

/**
 * Détermine si la sélection de taille est obligatoire pour un produit
 *
 * @param productTypeSlug - Slug du type de produit (ex: "ring", "bracelet")
 * @param sizes - Tailles disponibles
 * @returns true si la taille doit être sélectionnée
 */
export function shouldRequireSize(
	productTypeSlug: string | undefined | null,
	sizes: string[]
): boolean {
	if (sizes.length === 0) return false;

	// Si toutes les tailles sont "ajustable", pas besoin de sélection
	const hasAdjustableSizes = sizes.some((s) =>
		s.toLowerCase().includes("ajustable")
	);
	if (hasAdjustableSizes) return false;

	// Vérifier si le type de produit nécessite une taille
	if (!productTypeSlug) return false;

	return PRODUCT_TYPES_REQUIRING_SIZE.includes(
		productTypeSlug as (typeof PRODUCT_TYPES_REQUIRING_SIZE)[number]
	);
}

// ============================================================================
// CALCULS DE QUANTITÉ
// ============================================================================

/** Item du panier simplifié pour les calculs */
export type CartItemForQuantity = {
	skuId: string;
	quantity: number;
};

/**
 * Calcule la quantité disponible à ajouter au panier pour un SKU
 *
 * @param sku - SKU sélectionné (ou null)
 * @param cartItems - Items actuels du panier
 * @param maxPerOrder - Quantité max par commande (défaut: 10)
 * @returns Quantité disponible à ajouter
 */
export function calculateAvailableQuantity(
	sku: { id: string; inventory: number } | null | undefined,
	cartItems: CartItemForQuantity[],
	maxPerOrder = 10
): {
	quantityInCart: number;
	availableToAdd: number;
	maxQuantity: number;
} {
	if (!sku) {
		return {
			quantityInCart: 0,
			availableToAdd: 0,
			maxQuantity: maxPerOrder,
		};
	}

	const quantityInCart =
		cartItems.find((item) => item.skuId === sku.id)?.quantity ?? 0;
	const availableToAdd = Math.max(0, sku.inventory - quantityInCart);
	const maxQuantity = Math.min(availableToAdd, maxPerOrder);

	return {
		quantityInCart,
		availableToAdd,
		maxQuantity,
	};
}

// ============================================================================
// INITIALISATION DE FORMULAIRE
// ============================================================================

/** Valeurs par défaut pour le formulaire de sélection SKU */
export type SkuFormDefaults = {
	color: string;
	material: string;
	size: string;
	quantity: number;
};

/**
 * Calcule les valeurs par défaut pour le formulaire de sélection de SKU
 * avec auto-sélection intelligente
 *
 * Priorité pour chaque variante:
 * 1. Valeur pré-sélectionnée (preselectedColor)
 * 2. Valeur du SKU par défaut
 * 3. Auto-sélection si une seule option disponible
 *
 * @param product - Produit avec ses SKUs
 * @param preselectedColor - Couleur pré-sélectionnée (optionnel)
 * @returns Valeurs par défaut du formulaire
 */
export function initializeSkuFormDefaults<
	TSku extends BaseSkuForList & { size?: string | null },
	TProduct extends { skus?: TSku[] | null }
>(product: TProduct, preselectedColor?: string | null): SkuFormDefaults {
	const activeSkus = product.skus?.filter((sku) => sku.isActive) || [];
	const defaultSku = activeSkus.find((sku) => sku.isDefault) ?? activeSkus[0];

	// Extraire les variantes uniques
	const { colors, materials, sizes } = extractUniqueVariants(activeSkus);

	// Extraire les sets de slugs pour l'auto-sélection
	const uniqueColorSlugs = new Set(colors.map((c) => c.slug));
	const uniqueMaterialSlugs = new Set(materials.map((m) => m.slug));
	const uniqueSizes = new Set(sizes);

	// Calculer les valeurs initiales avec auto-sélection intelligente
	const initialColor =
		preselectedColor ||
		defaultSku?.color?.slug ||
		(uniqueColorSlugs.size === 1 ? [...uniqueColorSlugs][0] : "") ||
		"";

	const defaultMaterialSlug = defaultSku?.material?.name
		? slugify(defaultSku.material.name)
		: "";
	const initialMaterial =
		defaultMaterialSlug ||
		(uniqueMaterialSlugs.size === 1 ? [...uniqueMaterialSlugs][0] : "") ||
		"";

	const initialSize =
		defaultSku?.size ||
		(uniqueSizes.size === 1 ? [...uniqueSizes][0] : "") ||
		"";

	return {
		color: initialColor,
		material: initialMaterial,
		size: initialSize,
		quantity: 1,
	};
}

// Ré-export des types pour faciliter les imports
export type { StockStatus, ProductStockInfo } from "@/shared/types/product-sku.types";
