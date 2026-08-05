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
import { logger } from "@/shared/lib/logger";
import { PRODUCT_CAROUSEL_CONFIG } from "../constants/carousel.constants";
import { PRODUCT_TEXTS } from "../constants/product-texts.constants";
import type {
	ProductFromList,
	SkuFromList,
	ColorSwatch,
} from "@/modules/products/types/product-list.types";
import type { ProductStockInfo, StockStatus } from "@/shared/types/product-sku.types";
import {
	getPrimarySkuForList,
	type GetPrimarySkuOptions,
} from "@/modules/skus/services/sku-selection.service";
import { buildComboKey } from "@/modules/skus/services/sku-info-extraction.service";
import { getPrimaryMaterialName } from "@/modules/skus/utils/sku-materials-label";
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
 * Choisit le média à utiliser comme IMAGE représentative d'un SKU.
 *
 * Priorité : média `isPrimary` de type IMAGE → premier média de type IMAGE → `null`.
 *
 * ⚠️ SSOT à utiliser partout où l'on a besoin d'UNE url d'image à partir d'un tableau
 * de médias mixtes. Les selects `GET_PRODUCT_SELECT` / `GET_PRODUCTS_SELECT` ne filtrent
 * volontairement pas `mediaType` (la galerie a besoin des vidéos) mais sélectionnent
 * `mediaType` précisément pour que l'appelant trie. Trois consommateurs ne le
 * faisaient pas et écrivaient un `.mp4` là où une image est requise : `og:image` /
 * `twitter:images` (carte sociale cassée au partage), le champ `image` du nœud
 * `Product` d'un `ItemList` JSON-LD (invalide en schema.org, rejet Google Merchant), et
 * la vignette de recherche rapide (`<Image src>` sur une vidéo → vignette cassée + une
 * transformation `/_next/image` facturée pour rien).
 *
 * Retourne `null` quand aucun rendu image n'est possible : l'appelant OMET alors le
 * champ plutôt que de publier une url invalide.
 *
 * @public
 */
export function pickPrimaryImage<T extends { mediaType: string; isPrimary: boolean }>(
	images: readonly T[] | undefined,
): T | null {
	if (!images?.length) return null;

	return (
		images.find((img) => img.isPrimary && img.mediaType === "IMAGE") ??
		images.find((img) => img.mediaType === "IMAGE") ??
		null
	);
}

/**
 * Extrait l'image principale d'un SKU (fonction utilitaire unique)
 *
 * Délègue le choix du média à `pickPrimaryImage` et n'ajoute que l'habillage
 * (alt dérivé, blurDataUrl).
 *
 * @param sku - SKU dont on veut extraire l'image
 * @param productTitle - Titre du produit pour le texte alt
 * @returns Image extraite ou null si aucune image trouvée
 */
function extractImageFromSku(sku: SkuFromList, productTitle: string): ExtractedImage | null {
	const image = pickPrimaryImage(sku.images);
	if (!image) {
		return null;
	}

	const fallbackQualifier = image.isPrimary ? "Image principale" : "Variante";

	return {
		id: image.id,
		url: image.url,
		mediaType: "IMAGE",
		alt: truncateAltText(
			image.altText ??
				`${productTitle} - ${getPrimaryMaterialName(sku.materials) ?? sku.colors[0]?.color.name ?? fallbackQualifier}`,
		),
		blurDataUrl: image.blurDataUrl ?? undefined,
	};
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
		logger.warn(`Product "${product.slug}" has no active SKU. Returning price: 0`, {
			service: "product-display",
		});
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
	const activeSkus = product.skus.filter((s) => s.isActive);
	return getPrimaryImageFromSku(primarySku, product, activeSkus);
}

// ============================================================================
// HELPER COMBINÉ POUR PRODUCTCARD (OPTIMISÉ O(n))
// ============================================================================

import type { ProductCardData } from "../types/product.types";

/**
 * Récupère toutes les données nécessaires à ProductCard en une seule passe.
 *
 * OPTIMISATION : Évite 5 appels séparés qui itèrent chacun sur les SKUs.
 * Réduit la complexité de O(5n) à O(n) pour les produits avec beaucoup de SKUs.
 *
 * @param product - Produit avec ses SKUs
 * @param options - Options d'affichage (couleur préférée, promotion)
 * @returns Toutes les données formatées pour ProductCard
 *
 * @example
 * ```tsx
 * // Sans filtre
 * const data = getProductCardData(product);
 *
 * // Avec filtre couleur actif (thumbnail s'adapte)
 * const data = getProductCardData(product, { activeColorSlug: "or" });
 *
 * // Avec filtre promotion actif (affiche le SKU en promo)
 * const data = getProductCardData(product, { preferOnSale: true });
 * ```
 */
export function getProductCardData(
	product: ProductFromList,
	options?: { activeColorSlug?: string; preferOnSale?: boolean },
): ProductCardData {
	const skus = product.skus;

	// === 1. Trouver le SKU principal via la fonction unifiée ===
	// Utilise getPrimarySkuForList avec le paramètre couleur préférée (Baymard pattern)
	const skuOptions: GetPrimarySkuOptions | undefined =
		options?.activeColorSlug || options?.preferOnSale
			? { preferredColorSlug: options.activeColorSlug, preferOnSale: options.preferOnSale }
			: undefined;
	const defaultSku = getPrimarySkuForList<SkuFromList, ProductFromList>(product, skuOptions);

	// === 2. Passe unique sur les SKUs actifs pour extraire toutes les données ===
	let totalInventory = 0;
	let availableSkus = 0;
	const colorMap = new Map<string, ColorSwatch>();
	const comboMap = new Map<string, ColorSwatch>();
	let hasMultiColorSku = false;

	for (const sku of skus) {
		if (!sku.isActive) continue;

		// Stock
		totalInventory += sku.inventory;
		if (sku.inventory > 0) availableSkus++;

		// Couleurs M2M : on agrège chaque couleur unique vue dans les SKUs.
		// `inStock` = la couleur est présente sur au moins un SKU en stock (au moins
		// 1 unité). Hex validated at display time to prevent style injection.
		for (const link of sku.colors) {
			const c = link.color;
			if (!c.slug || !c.hex || !HEX_PATTERN.test(c.hex)) continue;
			const existing = colorMap.get(c.slug);
			const inStock = existing?.inStock === true || sku.inventory > 0;
			colorMap.set(c.slug, {
				slug: c.slug,
				hex: c.hex,
				name: c.name,
				inStock,
			});
		}

		// Combos M2M : on accumule chaque combinaison de couleurs portée par les
		// SKUs actifs. Une carte produit avec au moins un SKU multi-couleur passe
		// en mode combos (pastille split-gradient + lien `?variant=`).
		const skuColors = sku.colors;
		if (skuColors.length > 1) hasMultiColorSku = true;
		if (skuColors.length > 0) {
			const ordered = [...skuColors].sort((a, b) => a.position - b.position);
			const validLinks = ordered.filter(
				(link) => link.color.slug && link.color.hex && HEX_PATTERN.test(link.color.hex),
			);
			if (validLinks.length > 0) {
				// `link.color` extrait une fois : évite 3 déréférencements imbriqués par lien.
				const linkedColors = validLinks.map((link) => link.color);
				const slugs = linkedColors.map((color) => color.slug);
				const hexes = linkedColors.map((color) => color.hex);
				const names = linkedColors.map((color) => color.name);
				const comboKey = buildComboKey(slugs);
				const existing = comboMap.get(comboKey);
				const inStock = existing?.inStock === true || sku.inventory > 0;
				comboMap.set(comboKey, {
					slug: comboKey,
					hex: hexes[0]!,
					name: names.join(" + "),
					inStock,
					hexes,
					comboKey,
					names,
				});
			}
		}
	}

	// === 3. Construire les résultats ===

	// Prix depuis le SKU principal
	const price = defaultSku?.priceInclTax ?? 0;
	const compareAtPrice = defaultSku?.compareAtPrice ?? null;

	// Matière principale du SKU affiché — déjà chargée par les selects catalogue,
	// affichée sous le titre de la carte (redesign Atelier 2026-08-03)
	const material = defaultSku ? getPrimaryMaterialName(defaultSku.materials) : null;

	// Warning en dev si pas de SKU
	if (!defaultSku && process.env.NODE_ENV === "development") {
		logger.warn(`Product "${product.slug}" has no active SKU`, { service: "product-display" });
	}

	// Stock info avec support low_stock. La rupture se juge sur l'AGRÉGAT (tous
	// SKUs actifs à 0 = rien à vendre), mais l'urgence se juge sur le SKU AFFICHÉ :
	// l'agrégat mentait dans les deux sens — 3 couleurs × 1 exemplaire affichait
	// « Plus que 3 ! », et une variante presque épuisée n'affichait rien si une
	// autre couleur était bien stockée (audit ProductCard 2026-08-03).
	const displayedInventory = defaultSku?.inventory ?? 0;
	let status: StockStatus;
	let message: string;

	if (totalInventory === 0) {
		status = "out_of_stock";
		message = PRODUCT_TEXTS.STOCK.OUT_OF_STOCK;
	} else if (displayedInventory > 0 && displayedInventory <= STOCK_THRESHOLDS.LOW) {
		status = "low_stock";
		message = PRODUCT_TEXTS.STOCK.LOW_STOCK_LEFT(displayedInventory);
	} else {
		status = "in_stock";
		message = PRODUCT_TEXTS.STOCK.IN_STOCK;
	}

	const stockInfo: ProductStockInfo = {
		status,
		totalInventory,
		availableSkus,
		message,
	};

	// Image principale (réutilise la logique existante mais avec le SKU déjà trouvé)
	const activeSkus = skus.filter((s) => s.isActive);
	const primaryImage = getPrimaryImageFromSku(defaultSku, product, activeSkus);

	// Secondary image for hover effect (different from primary)
	const secondaryImage = getSecondaryImage(defaultSku, activeSkus, product.title, primaryImage);

	// Si au moins un SKU multi-couleur existe, la carte présente des combos
	// (pastilles split-gradient, lien `?variant=`). Sinon, mode legacy avec
	// 1 pastille par couleur mono et lien `?color=`.
	const colors = hasMultiColorSku ? Array.from(comboMap.values()) : Array.from(colorMap.values());

	return {
		defaultSku,
		price,
		compareAtPrice,
		stockInfo,
		primaryImage,
		secondaryImage,
		colors,
		material,
		hasValidSku: defaultSku !== null && defaultSku.isActive,
	};
}

/**
 * Extracts a secondary image different from the primary one (for hover effect).
 * Priority: non-primary image from default SKU, then image from another active SKU.
 *
 * The comparison is on id AND url: two media rows can point at the same file
 * (typical of SKUs sharing a photo). A same-url "alternative view" makes the
 * hover swap a visual no-op, and its `loading="lazy"` instance overwrites the
 * eager one in Next's per-URL LCP bookkeeping (`allImgs` in get-img-props),
 * triggering a false "detected as LCP, add loading=eager" warning on the card
 * that IS preloaded.
 */
function getSecondaryImage(
	defaultSku: SkuFromList | null,
	activeSkus: SkuFromList[],
	productTitle: string,
	primaryImage: Pick<ExtractedImage, "id" | "url">,
): ExtractedImage | null {
	// Priority 1: Another image from the default SKU
	if (defaultSku?.images) {
		const secondaryFromDefaultSku = defaultSku.images.find(
			(img) =>
				img.mediaType === "IMAGE" && img.id !== primaryImage.id && img.url !== primaryImage.url,
		);
		if (secondaryFromDefaultSku) {
			return {
				id: secondaryFromDefaultSku.id,
				url: secondaryFromDefaultSku.url,
				mediaType: "IMAGE",
				alt: truncateAltText(
					secondaryFromDefaultSku.altText ?? `${productTitle} - Vue alternative`,
				),
				blurDataUrl: secondaryFromDefaultSku.blurDataUrl ?? undefined,
			};
		}
	}

	// Priority 2: Primary image from a different active SKU
	for (const sku of activeSkus) {
		if (sku.id === defaultSku?.id) continue;
		const image = extractImageFromSku(sku, productTitle);
		if (image && image.id !== primaryImage.id && image.url !== primaryImage.url) return image;
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
	activeSkus: SkuFromList[],
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
