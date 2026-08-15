/**
 * Helpers de display pour les listes de produits — schéma lean (lot 2).
 *
 * Le média vit sur le PRODUIT (`product.media`), une variante porte UNE couleur
 * et UN matériau, le prix affiché = `variant.priceCents ?? product.priceCents`.
 */

import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import { logger } from "@/shared/lib/logger";
import { PRODUCT_CAROUSEL_CONFIG } from "../constants/carousel.constants";
import { PRODUCT_TEXTS } from "../constants/product-texts.constants";
import type {
	ProductFromList,
	VariantFromList,
	ColorSwatch,
} from "@/modules/products/types/product-list.types";
import type { ProductStockInfo, StockStatus } from "@/shared/types/product-variant.types";
import {
	getPrimaryVariantForList,
	type GetPrimaryVariantOptions,
} from "@/modules/variants/services/variant-selection.service";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";

/** Validates hex color format at display time (defense in depth) */
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Tronque le texte alternatif pour SEO (max 120 caractères par défaut)
 */
function truncateAltText(
	text: string,
	maxLength = PRODUCT_CAROUSEL_CONFIG.MAX_ALT_TEXT_LENGTH,
): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + "...";
}

/**
 * Type de retour pour l'extraction d'image — `alt` est REQUIS (les chemins de
 * construction en posent toujours un).
 */
type ExtractedImage = {
	id: string;
	url: string;
	alt: string;
	type: "IMAGE";
	blurDataUrl?: string;
};

/**
 * Choisit le média à utiliser comme IMAGE représentative.
 *
 * Règle : première IMAGE de l'ordre canonique `(position asc, id asc)` → `null`.
 * Les selects livrent les médias déjà triés dans cet ordre ; « premier média »
 * ≠ « première IMAGE » — `ProductMedia` est polymorphe et une vidéo peut occuper
 * le rang 0, d'où le filtre `type` AVANT de prendre le premier.
 *
 * ⚠️ SSOT à utiliser partout où l'on a besoin d'UNE url d'image à partir d'un
 * tableau de médias mixtes (og:image, JSON-LD, vignettes). Retourne `null`
 * quand aucun rendu image n'est possible : l'appelant OMET alors le champ
 * plutôt que de publier une url invalide.
 *
 * @public
 */
export function pickPrimaryImage<T extends { type: string }>(
	images: readonly T[] | undefined,
): T | null {
	if (!images?.length) return null;

	return images.find((img) => img.type === "IMAGE") ?? null;
}

/** Médias minimaux attendus par les helpers d'image. */
type MediaLike = {
	id: string;
	url: string;
	alt?: string | null;
	type: string;
};

/** Extrait la Nième IMAGE du média produit (habillage alt inclus). */
function extractImageAt(
	media: readonly MediaLike[] | undefined,
	index: number,
	productName: string,
): ExtractedImage | null {
	if (!media?.length) return null;
	const images = media.filter((m) => m.type === "IMAGE");
	const image = images[index];
	if (!image) return null;

	return {
		id: image.id,
		url: image.url,
		type: "IMAGE",
		alt: truncateAltText(image.alt ?? `${productName} - Image ${index + 1}`),
	};
}

/**
 * Récupère l'image principale du produit — retourne TOUJOURS une image
 * (placeholder SVG en dernier recours).
 */
export function getPrimaryImageForList(product: ProductFromList): ExtractedImage {
	return (
		extractImageAt(product.media, 0, product.name) ?? {
			...FALLBACK_PRODUCT_IMAGE,
			alt: truncateAltText(`${product.name} - ${FALLBACK_PRODUCT_IMAGE.alt}`),
		}
	);
}

// ============================================================================
// HELPER COMBINÉ POUR PRODUCTCARD (OPTIMISÉ O(n))
// ============================================================================

import type { ProductCardData } from "../types/product.types";

/**
 * Récupère toutes les données nécessaires à ProductCard en une seule passe.
 *
 * @param product - Produit avec ses variantes et médias
 * @param options - Options d'affichage (couleur préférée — identité = nom)
 */
export function getProductCardData(
	product: ProductFromList,
	options?: { activeColorSlug?: string },
): ProductCardData {
	const variants = product.variants;

	// === 1. Variante principale ===
	const variantOptions: GetPrimaryVariantOptions | undefined = options?.activeColorSlug
		? { preferredColorSlug: options.activeColorSlug }
		: undefined;
	const defaultVariant = getPrimaryVariantForList<VariantFromList, ProductFromList>(
		product,
		variantOptions,
	);

	// === 2. Passe unique sur les variantes actives ===
	let totalStock = 0;
	let availableVariants = 0;
	const colorMap = new Map<string, ColorSwatch>();

	for (const variant of variants) {
		if (!variant.active) continue;

		totalStock += variant.stock;
		if (variant.stock > 0) availableVariants++;

		const c = variant.color;
		if (c?.hex && HEX_PATTERN.test(c.hex)) {
			const existing = colorMap.get(c.name);
			const inStock = existing?.inStock === true || variant.stock > 0;
			colorMap.set(c.name, {
				slug: c.name,
				hex: c.hex,
				name: c.name,
				inStock,
			});
		}
	}

	// === 3. Construire les résultats ===

	// Prix affiché : override variante, sinon prix produit
	const price = defaultVariant?.priceCents ?? product.priceCents;

	// Matériau de la variante affichée
	const material = defaultVariant?.material?.name ?? null;

	if (!defaultVariant && process.env.NODE_ENV === "development") {
		logger.warn(`Product "${product.slug}" has no active variant`, {
			service: "product-display",
		});
	}

	// Stock : la rupture se juge sur l'AGRÉGAT, l'urgence sur la variante AFFICHÉE
	const displayedStock = defaultVariant?.stock ?? 0;
	let status: StockStatus;
	let message: string;

	if (totalStock === 0) {
		status = "out_of_stock";
		message = PRODUCT_TEXTS.STOCK.OUT_OF_STOCK;
	} else if (displayedStock > 0 && displayedStock <= STOCK_THRESHOLDS.LOW) {
		status = "low_stock";
		message = PRODUCT_TEXTS.STOCK.LOW_STOCK_LEFT(displayedStock);
	} else {
		status = "in_stock";
		message = PRODUCT_TEXTS.STOCK.IN_STOCK;
	}

	const stockInfo: ProductStockInfo = {
		status,
		totalStock,
		availableVariants,
		message,
	};

	// Images produit : rang 0 = principale, rang 1 = hover
	const primaryImage = getPrimaryImageForList(product);
	const secondary = extractImageAt(product.media, 1, product.name);
	const secondaryImage =
		secondary && secondary.id !== primaryImage.id && secondary.url !== primaryImage.url
			? secondary
			: null;

	return {
		defaultVariant,
		price,
		stockInfo,
		primaryImage,
		secondaryImage,
		colors: Array.from(colorMap.values()),
		material,
		hasValidVariant: defaultVariant !== null && defaultVariant.active,
	};
}
