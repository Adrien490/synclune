/**
 * Helpers de display pour les listes de produits
 *
 * Ce module contient les fonctions de composition et d'affichage pour :
 * - Récupérer le prix principal
 * - Récupérer l'image principale
 * - Déterminer la disponibilité (Schema.org)
 *
 * Les fonctions de sélection SKU et d'affichage des variantes sont
 * ré-exportées depuis leurs modules respectifs pour rétrocompatibilité.
 */

import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import { PRODUCT_CAROUSEL_CONFIG } from "../constants/carousel.constants";
import type { ProductFromList } from "@/modules/products/types/product-list.types";
import {
	getPrimarySkuForList,
	getStockInfoForList,
} from "@/modules/skus/services/sku-selection";

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
} from "@/modules/skus/services/sku-selection";

// Fonctions d'affichage des variantes
export {
	getPrimaryColorForList,
	getAvailableColorsForList,
	getVariantCountForList,
	hasMultipleVariants,
	getPriceRangeForList,
} from "./product-variant-display";
