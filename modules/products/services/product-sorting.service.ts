/**
 * Helpers de display pour les listes de produits
 *
 * Ce module contient les fonctions de composition et d'affichage pour :
 * - Récupérer le prix principal
 * - Récupérer l'image principale
 * - Déterminer la disponibilité (Schema.org)
 * - Récupérer toutes les données d'une ProductCard en une seule passe (optimisé)
 *
 * Les fonctions de sélection SKU et d'affichage des variantes sont
 * ré-exportées depuis leurs modules respectifs pour rétrocompatibilité.
 */

import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import { PRODUCT_CAROUSEL_CONFIG } from "../constants/carousel.constants";
import type {
	ProductFromList,
	SkuFromList,
	ColorSwatch,
} from "@/modules/products/types/product-list.types";
import type { ProductStockInfo, StockStatus } from "@/modules/skus/types/sku-selection.types";
import {
	getPrimarySkuForList,
	getStockInfoForList,
} from "@/modules/skus/services/sku-selection.service";

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
 * Récupère le prix principal (priceInclTax pour affichage client)
 * Inclut compareAtPrice pour affichage des promotions
 *
 * @warning Retourne price: 0 si aucun SKU actif n'existe.
 * Cela peut indiquer un problème de données (produit sans variantes).
 */
export function getPrimaryPriceForList(product: ProductFromList): {
	price: number;
	compareAtPrice: number | null;
} {
	// SKU principal depuis la liste
	const primarySku = getPrimarySkuForList(product);
	if (primarySku) {
		return {
			price: primarySku.priceInclTax,
			compareAtPrice: primarySku.compareAtPrice ?? null,
		};
	}

	// Pas de SKU actif - log warning en dev pour détecter les données manquantes
	if (process.env.NODE_ENV === "development") {
		console.warn(
			`[getPrimaryPriceForList] Produit "${product.slug}" n'a aucun SKU actif. Prix retourné: 0`
		);
	}

	return {
		price: 0,
		compareAtPrice: null,
	};
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
		const primaryImage = primarySku.images.find(
			(img) => img.isPrimary && img.mediaType === "IMAGE"
		);
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
		const firstImage = primarySku.images.find(
			(img) => img.mediaType === "IMAGE"
		);
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
					sku.images.find(
						(img) => img.isPrimary && img.mediaType === "IMAGE"
					) || sku.images.find((img) => img.mediaType === "IMAGE");

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

// ============================================================================
// HELPER COMBINÉ POUR PRODUCTCARD (OPTIMISÉ O(n))
// ============================================================================

/** Type de retour pour getProductCardData */
export interface ProductCardData {
	defaultSku: SkuFromList | null;
	price: number;
	compareAtPrice: number | null;
	stockInfo: ProductStockInfo;
	primaryImage: {
		id: string;
		url: string;
		alt?: string;
		mediaType: "IMAGE";
		blurDataUrl?: string;
	};
	colors: ColorSwatch[];
}

/**
 * Récupère toutes les données nécessaires à ProductCard en une seule passe.
 *
 * OPTIMISATION : Évite 5 appels séparés qui itèrent chacun sur les SKUs.
 * Réduit la complexité de O(5n) à O(n) pour les produits avec beaucoup de SKUs.
 *
 * @param product - Produit avec ses SKUs
 * @returns Toutes les données formatées pour ProductCard
 *
 * @example
 * ```tsx
 * const { defaultSku, price, compareAtPrice, stockInfo, primaryImage, colors } =
 *   getProductCardData(product);
 * ```
 */
export function getProductCardData(product: ProductFromList): ProductCardData {
	const skus = product.skus ?? [];

	// === 1. Trouver le SKU principal (même logique que getPrimarySkuForList) ===
	let defaultSku: SkuFromList | null = null;

	// Priorité 1: SKU avec isDefault = true
	defaultSku = skus.find((sku) => sku.isActive && sku.isDefault) ?? null;

	// Priorité 2: SKU en stock, trié par prix ASC
	if (!defaultSku) {
		const inStockSkus = skus
			.filter((sku) => sku.isActive && sku.inventory > 0)
			.sort((a, b) => a.priceInclTax - b.priceInclTax);
		defaultSku = inStockSkus[0] ?? null;
	}

	// Priorité 3: Premier SKU actif
	if (!defaultSku) {
		defaultSku = skus.find((sku) => sku.isActive) ?? skus[0] ?? null;
	}

	// === 2. Passe unique sur les SKUs actifs pour extraire toutes les données ===
	let totalInventory = 0;
	let availableSkus = 0;
	const colorMap = new Map<string, ColorSwatch>();

	for (const sku of skus) {
		if (!sku.isActive) continue;

		// Stock
		totalInventory += sku.inventory;
		if (sku.inventory > 0) availableSkus++;

		// Couleurs
		if (sku.color?.slug && sku.color?.hex) {
			const existing = colorMap.get(sku.color.slug);
			const inStock = existing?.inStock || sku.inventory > 0;
			colorMap.set(sku.color.slug, {
				slug: sku.color.slug,
				hex: sku.color.hex,
				name: sku.color.name,
				inStock,
			});
		}
	}

	// === 3. Construire les résultats ===

	// Prix depuis le SKU principal
	const price = defaultSku?.priceInclTax ?? 0;
	const compareAtPrice = defaultSku?.compareAtPrice ?? null;

	// Warning en dev si pas de SKU
	if (!defaultSku && process.env.NODE_ENV === "development") {
		console.warn(
			`[getProductCardData] Produit "${product.slug}" n'a aucun SKU actif.`
		);
	}

	// Stock info
	const status: StockStatus = totalInventory === 0 ? "out_of_stock" : "in_stock";
	const stockInfo: ProductStockInfo = {
		status,
		totalInventory,
		availableSkus,
		message: status === "out_of_stock" ? "Rupture de stock" : "En stock",
	};

	// Image principale (réutilise la logique existante mais avec le SKU déjà trouvé)
	const primaryImage = getPrimaryImageFromSku(
		defaultSku,
		product,
		skus.filter((s) => s.isActive)
	);

	return {
		defaultSku,
		price,
		compareAtPrice,
		stockInfo,
		primaryImage,
		colors: Array.from(colorMap.values()),
	};
}

/**
 * Extrait l'image principale depuis un SKU ou fallback sur les autres SKUs
 * Fonction interne utilisée par getProductCardData
 */
function getPrimaryImageFromSku(
	primarySku: SkuFromList | null,
	product: ProductFromList,
	activeSkus: SkuFromList[]
): ProductCardData["primaryImage"] {
	// Priorité 1: Image du SKU principal
	if (primarySku?.images && primarySku.images.length > 0) {
		const primaryImage = primarySku.images.find(
			(img) => img.isPrimary && img.mediaType === "IMAGE"
		);
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

		// Fallback: première image disponible
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

	// Priorité 2: Image de n'importe quel SKU actif
	for (const sku of activeSkus) {
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
							`${product.title} - ${sku.material?.name || sku.color?.name || "Variante"}`
					),
					blurDataUrl: skuImage.blurDataUrl ?? undefined,
				};
			}
		}
	}

	// Fallback final: placeholder
	return {
		...FALLBACK_PRODUCT_IMAGE,
		alt: truncateAltText(`${product.title} - ${FALLBACK_PRODUCT_IMAGE.alt}`),
	};
}

// ============================================================================
// RÉ-EXPORTS POUR RÉTROCOMPATIBILITÉ
// Ces exports permettent aux imports existants de continuer à fonctionner
// ============================================================================

// Types
export type {
	ProductFromList,
	SkuFromList,
	ColorSwatch,
} from "@/modules/products/types/product-list.types";

export type {
	StockStatus,
	ProductStockInfo,
} from "@/modules/skus/types/sku-selection.types";

// Fonctions de sélection SKU
export {
	getPrimarySkuForList,
	getSkuByColorForList,
	computeStockFromSkus,
	getStockInfoForList,
} from "@/modules/skus/services/sku-selection.service";

// Fonctions d'affichage des variantes
export {
	getPrimaryColorForList,
	getAvailableColorsForList,
	getVariantCountForList,
	hasMultipleVariants,
	getPriceRangeForList,
} from "./product-variant-display";
