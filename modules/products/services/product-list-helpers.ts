import { GetProductsReturn } from "@/modules/products/data/get-products";
import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import { PRODUCT_CAROUSEL_CONFIG } from "../constants/carousel.constants";

/**
 * Utilitaires pour les listes de produits avec types simplifiés
 * Ces utilitaires travaillent avec les SKUs minimaux de get-products
 */

export type ProductFromList = GetProductsReturn["products"][0];
export type SkuFromList = ProductFromList["skus"][0];

export type StockStatus = "in_stock" | "out_of_stock"; // Système simplifié

/** Type pour les pastilles couleur sur ProductCard */
export type ColorSwatch = {
	slug: string;
	hex: string;
	name: string;
	inStock: boolean;
};

export type ProductStockInfo = {
	status: StockStatus;
	totalInventory: number;
	availableSkus: number;
	message: string;
};

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
 * Tronque le texte alternatif pour SEO (max 120 caractères par défaut)
 */
function truncateAltText(
	text: string,
	maxLength = PRODUCT_CAROUSEL_CONFIG.MAX_ALT_TEXT_LENGTH
): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + "...";
}

/**
 * Récupère le SKU principal pour les listes (logique de sélection intelligente)
 */
export function getPrimarySkuForList(
	product: ProductFromList
): SkuFromList | null {
	// Logique de sélection intelligente
	if (!product.skus || product.skus.length === 0) {
		return null;
	}

	// 1. SKU avec isDefault = true
	const defaultFlagSku = product.skus.find((sku) => sku.isActive && sku.isDefault);
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
 * Récupère le prix principal (priceInclTax pour affichage client)
 */
export function getPrimaryPriceForList(product: ProductFromList): {
	price: number;
} {
	// SKU principal depuis la liste
	const primarySku = getPrimarySkuForList(product);
	if (primarySku) {
		return {
			price: primarySku.priceInclTax,
		};
	}

	// Pas de SKU actif, retourner 0
	return {
		price: 0,
	};
}

/**
 * Récupère les informations de stock du produit
 */
export function getStockInfoForList(
	product: ProductFromList
): ProductStockInfo {
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

/**
 * Récupère la couleur principale du SKU principal
 */
export function getPrimaryColorForList(product: ProductFromList): {
	hex?: string;
	name?: string;
} {
	const primarySku = getPrimarySkuForList(product);
	if (!primarySku) return {};

	const fallbackName = primarySku.material?.name || undefined;

	if (primarySku.color?.hex) {
		return {
			hex: primarySku.color.hex,
			name: primarySku.color.name || fallbackName,
		};
	}

	return fallbackName ? { name: fallbackName } : {};
}

/**
 * Récupère l'image principale depuis le SKU principal ou SKUs
 *
 * IMPORTANT: Cette fonction retourne TOUJOURS une image (jamais null)
 * - Priorité 1: Image principale du SKU par défaut
 * - Priorité 2: Première image du SKU par défaut
 * - Priorité 3: Image de n'importe quel SKU actif
 * - Fallback final: Image SVG de placeholder élégante
 *
 * Les médias principaux sont UNIQUEMENT des images (jamais de vidéos)
 */
export function getPrimaryImageForList(product: ProductFromList): {
	id: string;
	url: string;
	alt?: string;
	mediaType: "IMAGE";
	blurDataUrl?: string;
} {
	// Priorité 1: Image du SKU principal
	const primarySku = getPrimarySkuForList(product);
	if (primarySku?.images && primarySku.images.length > 0) {
		// Chercher d'abord un média principal de type IMAGE (isPrimary garantit IMAGE grâce à la contrainte DB)
		const primaryImage = primarySku.images.find((img) => img.isPrimary && img.mediaType === "IMAGE");
		if (primaryImage) {
			return {
				id: primaryImage.id,
				url: primaryImage.url,
				mediaType: "IMAGE",
				alt: truncateAltText(
					primaryImage.altText ||
						`${product.title} - ${
							primarySku.material?.name ||
							primarySku.color?.name ||
							"Image principale"
						}`
				),
				blurDataUrl: primaryImage.blurDataUrl ?? undefined,
			};
		}

		// Fallback: première image disponible (pas vidéo)
		const firstImage = primarySku.images.find((img) => img.mediaType === "IMAGE");
		if (firstImage) {
			return {
				id: firstImage.id,
				url: firstImage.url,
				mediaType: "IMAGE",
				alt: truncateAltText(
					firstImage.altText ||
						`${product.title} - ${
							primarySku.material?.name ||
							primarySku.color?.name ||
							"Image principale"
						}`
				),
				blurDataUrl: firstImage.blurDataUrl ?? undefined,
			};
		}
	}

	// Priorité 2: Image de n'importe quel SKU actif de la liste (filtrer les vidéos)
	if (product.skus) {
		for (const sku of product.skus.filter((s) => s.isActive)) {
			if (sku.images && sku.images.length > 0) {
				const skuImage =
					sku.images.find((img) => img.isPrimary && img.mediaType === "IMAGE") ||
					sku.images.find((img) => img.mediaType === "IMAGE");

				if (skuImage) {
					return {
						id: skuImage.id,
						url: skuImage.url,
						mediaType: "IMAGE",
						alt: truncateAltText(
							skuImage.altText ||
								`${product.title} - ${
									sku.material?.name || sku.color?.name || "Variante"
								}`
						),
						blurDataUrl: skuImage.blurDataUrl ?? undefined,
					};
				}
			}
		}
	}

	// Fallback final: Image SVG de placeholder
	// Cette fonction ne retourne JAMAIS null pour éviter les checks null partout
	return {
		...FALLBACK_PRODUCT_IMAGE,
		alt: truncateAltText(`${product.title} - ${FALLBACK_PRODUCT_IMAGE.alt}`),
	};
}

/**
 * Vérifie la disponibilité du produit pour les données structurées
 * Système simplifié : InStock ou OutOfStock uniquement
 */
export function getAvailabilityForList(product: ProductFromList): string {
	const stockInfo = getStockInfoForList(product);
	return stockInfo.status === "out_of_stock"
		? "https://schema.org/OutOfStock"
		: "https://schema.org/InStock";
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
	const activeSkus =
		product.skus?.filter((sku) => sku.isActive && sku.inventory > 0) || [];

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
	const activeSkus =
		product.skus?.filter((sku) => sku.isActive && sku.inventory > 0) || [];

	for (const sku of activeSkus) {
		if (sku.color?.hex) uniqueColors.add(sku.color.hex);
		if (sku.material?.name) uniqueMaterials.add(sku.material.name);
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
	const activeSkus = product.skus?.filter((sku) => sku.isActive) || [];
	if (activeSkus.length <= 1) return false;

	const uniqueColors = new Set(
		activeSkus.map((s) => s.color?.slug).filter(Boolean)
	);
	const uniqueMaterials = new Set(
		activeSkus.map((s) => s.material?.name).filter(Boolean)
	);
	const uniqueSizes = new Set(activeSkus.map((s) => s.size).filter(Boolean));

	return (
		uniqueColors.size > 1 || uniqueMaterials.size > 1 || uniqueSizes.size > 1
	);
}

/**
 * Extrait les couleurs disponibles pour les pastilles sur ProductCard
 * Retourne un tableau de ColorSwatch avec info stock
 */
export function getAvailableColorsForList(product: ProductFromList): ColorSwatch[] {
	const activeSkus = product.skus?.filter((sku) => sku.isActive && sku.color) || [];
	const colorMap = new Map<string, ColorSwatch>();

	for (const sku of activeSkus) {
		if (!sku.color?.slug || !sku.color?.hex) continue;

		const existing = colorMap.get(sku.color.slug);
		// Si la couleur existe déjà et était en stock, on garde cet état
		// Sinon on met à jour avec le stock du SKU actuel
		const inStock = existing?.inStock || sku.inventory > 0;

		colorMap.set(sku.color.slug, {
			slug: sku.color.slug,
			hex: sku.color.hex,
			name: sku.color.name,
			inStock,
		});
	}

	return Array.from(colorMap.values());
}
