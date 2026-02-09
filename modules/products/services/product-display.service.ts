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
import type { ProductStockInfo, StockStatus } from "@/shared/types/product-sku.types";
import {
	getPrimarySkuForList,
	getStockInfoForList,
	type GetPrimarySkuOptions,
} from "@/modules/skus/services/sku-selection.service";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";

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
 * Type de retour pour l'extraction d'image
 */
type ExtractedImage = {
	id: string;
	url: string;
	alt?: string;
	mediaType: "IMAGE";
	blurDataUrl?: string;
};

/**
 * Extrait l'image principale d'un SKU (fonction utilitaire unique)
 *
 * Priorité :
 * 1. Image marquée isPrimary de type IMAGE
 * 2. Première image de type IMAGE
 *
 * @param sku - SKU dont on veut extraire l'image
 * @param productTitle - Titre du produit pour le texte alt
 * @returns Image extraite ou null si aucune image trouvée
 */
function extractImageFromSku(
	sku: SkuFromList,
	productTitle: string
): ExtractedImage | null {
	if (!sku.images || sku.images.length === 0) {
		return null;
	}

	// Priorité 1: Image marquée isPrimary
	const primaryImage = sku.images.find(
		(img) => img.isPrimary && img.mediaType === "IMAGE"
	);
	if (primaryImage) {
		return {
			id: primaryImage.id,
			url: primaryImage.url,
			mediaType: "IMAGE",
			alt: truncateAltText(
				primaryImage.altText ||
					`${productTitle} - ${
						sku.material?.name || sku.color?.name || "Image principale"
					}`
			),
			blurDataUrl: primaryImage.blurDataUrl ?? undefined,
		};
	}

	// Priorité 2: Première image de type IMAGE
	const firstImage = sku.images.find((img) => img.mediaType === "IMAGE");
	if (firstImage) {
		return {
			id: firstImage.id,
			url: firstImage.url,
			mediaType: "IMAGE",
			alt: truncateAltText(
				firstImage.altText ||
					`${productTitle} - ${
						sku.material?.name || sku.color?.name || "Variante"
					}`
			),
			blurDataUrl: firstImage.blurDataUrl ?? undefined,
		};
	}

	return null;
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
 * - Priorité 1: Image du SKU principal (via extractImageFromSku)
 * - Priorité 2: Image de n'importe quel SKU actif
 * - Fallback final: Image SVG de placeholder élégante
 *
 * Les médias principaux sont UNIQUEMENT des images (jamais de vidéos)
 */
export function getPrimaryImageForList(product: ProductFromList): ExtractedImage {
	const primarySku = getPrimarySkuForList<SkuFromList, ProductFromList>(product);
	const activeSkus = product.skus?.filter((s) => s.isActive) ?? [];
	return getPrimaryImageFromSku(primarySku, product, activeSkus);
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

import type { ProductCardData } from "../types/product.types";

export type { ProductCardData } from "../types/product.types";

/**
 * Récupère toutes les données nécessaires à ProductCard en une seule passe.
 *
 * OPTIMISATION : Évite 5 appels séparés qui itèrent chacun sur les SKUs.
 * Réduit la complexité de O(5n) à O(n) pour les produits avec beaucoup de SKUs.
 *
 * @param product - Produit avec ses SKUs
 * @param activeColorSlug - Slug de la couleur filtrée (Baymard: thumbnail dynamique)
 * @returns Toutes les données formatées pour ProductCard
 *
 * @example
 * ```tsx
 * // Sans filtre couleur
 * const data = getProductCardData(product);
 *
 * // Avec filtre couleur actif (thumbnail s'adapte)
 * const data = getProductCardData(product, "or");
 * ```
 */
export function getProductCardData(
	product: ProductFromList,
	activeColorSlug?: string
): ProductCardData {
	const skus = product.skus ?? [];

	// === 1. Trouver le SKU principal via la fonction unifiée ===
	// Utilise getPrimarySkuForList avec le paramètre couleur préférée (Baymard pattern)
	const options: GetPrimarySkuOptions | undefined = activeColorSlug
		? { preferredColorSlug: activeColorSlug }
		: undefined;
	const defaultSku = getPrimarySkuForList<SkuFromList, ProductFromList>(product, options);

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

	// Stock info avec support low_stock
	let status: StockStatus;
	let message: string;

	if (totalInventory === 0) {
		status = "out_of_stock";
		message = "Rupture de stock";
	} else if (totalInventory <= STOCK_THRESHOLDS.LOW) {
		status = "low_stock";
		message = `Plus que ${totalInventory} !`;
	} else {
		status = "in_stock";
		message = "En stock";
	}

	const stockInfo: ProductStockInfo = {
		status,
		totalInventory,
		availableSkus,
		message,
	};

	// Image principale (réutilise la logique existante mais avec le SKU déjà trouvé)
	const activeSkus = skus.filter((s) => s.isActive);
	const primaryImage = getPrimaryImageFromSku(
		defaultSku,
		product,
		activeSkus
	);

	// Secondary image for hover effect (different from primary)
	const secondaryImage = getSecondaryImage(
		defaultSku,
		activeSkus,
		product.title,
		primaryImage.id
	);

	return {
		defaultSku,
		price,
		compareAtPrice,
		stockInfo,
		primaryImage,
		secondaryImage,
		colors: Array.from(colorMap.values()),
		hasValidSku: defaultSku !== null && defaultSku.isActive,
	};
}

/**
 * Extracts a secondary image different from the primary one (for hover effect).
 * Priority: non-primary image from default SKU, then image from another active SKU.
 */
function getSecondaryImage(
	defaultSku: SkuFromList | null,
	activeSkus: SkuFromList[],
	productTitle: string,
	primaryImageId: string
): ExtractedImage | null {
	// Priority 1: Another image from the default SKU
	if (defaultSku?.images) {
		const secondaryFromDefaultSku = defaultSku.images.find(
			(img) => img.mediaType === "IMAGE" && img.id !== primaryImageId
		);
		if (secondaryFromDefaultSku) {
			return {
				id: secondaryFromDefaultSku.id,
				url: secondaryFromDefaultSku.url,
				mediaType: "IMAGE",
				alt: truncateAltText(
					secondaryFromDefaultSku.altText ||
						`${productTitle} - Vue alternative`
				),
				blurDataUrl: secondaryFromDefaultSku.blurDataUrl ?? undefined,
			};
		}
	}

	// Priority 2: Primary image from a different active SKU
	for (const sku of activeSkus) {
		if (sku.id === defaultSku?.id) continue;
		const image = extractImageFromSku(sku, productTitle);
		if (image && image.id !== primaryImageId) return image;
	}

	return null;
}

/**
 * Extrait l'image principale depuis un SKU ou fallback sur les autres SKUs
 * Fonction interne utilisée par getProductCardData
 */
function getPrimaryImageFromSku(
	primarySku: SkuFromList | null,
	product: ProductFromList,
	activeSkus: SkuFromList[]
): ExtractedImage {
	// Priorité 1: Image du SKU principal
	if (primarySku) {
		const image = extractImageFromSku(primarySku, product.title);
		if (image) return image;
	}

	// Priorité 2: Image de n'importe quel SKU actif
	for (const sku of activeSkus) {
		const image = extractImageFromSku(sku, product.title);
		if (image) return image;
	}

	// Fallback final: placeholder
	return {
		...FALLBACK_PRODUCT_IMAGE,
		alt: truncateAltText(`${product.title} - ${FALLBACK_PRODUCT_IMAGE.alt}`),
	};
}

