import { FALLBACK_PRODUCT_IMAGE } from "@/modules/medias/constants/product-fallback-image";
import { findSkuByVariants } from "@/modules/skus/services/find-sku-by-variants";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductMedia } from "@/modules/medias/types/product-media.types";

/** Nombre maximum d'images dans la galerie */
const MAX_GALLERY_IMAGES = 20;

/** Nombre minimum d'images avant de chercher dans les autres SKUs */
const MIN_GALLERY_IMAGES = 5;

/**
 * Génère un alt text propre pour un média
 * Évite les textes mal formés quand material/color sont undefined
 */
function buildAltText(
	productTitle: string,
	variantInfo?: { materialName?: string | null; colorName?: string | null },
	fallbackSuffix = "Photo produit"
): string {
	const { materialName, colorName } = variantInfo || {};

	// Priorité: material > color > fallback
	const suffix = materialName || colorName || fallbackSuffix;

	return `${productTitle} - ${suffix}`;
}

interface BuildGalleryOptions {
	product: GetProductReturn;
	selectedVariants: {
		colorSlug?: string;
		materialSlug?: string;
		size?: string;
	};
}

/**
 * Construit la galerie d'images/vidéos d'un produit selon la priorité:
 * 1. Images du SKU sélectionné (variants)
 * 2. Images du SKU par défaut (product.skus[0])
 * 3. Images des autres SKUs actifs (max MAX_GALLERY_IMAGES total)
 * 4. Fallback image si aucune image disponible
 *
 * @param options - Options de construction de la galerie
 * @returns Tableau d'objets ProductMedia ordonnés par priorité
 */
export function buildGallery({
	product,
	selectedVariants,
}: BuildGalleryOptions): ProductMedia[] {
	// Vérification de sécurité: si pas de product, retourner tableau vide
	if (!product) {
		return [];
	}

	const { colorSlug, materialSlug, size } = selectedVariants;

	// Trouver le SKU correspondant aux variants
	const selectedSku =
		colorSlug || materialSlug || size
			? findSkuByVariants(product, {
					colorSlug: colorSlug || undefined,
					materialSlug: materialSlug || undefined,
					size: size || undefined,
				})
			: null;

	// Construire la galerie inline
	const gallery: Array<{
		id: string;
		url: string;
		thumbnailUrl?: string | null;
		thumbnailSmallUrl?: string | null;
		blurDataUrl?: string | null;
		alt: string;
		mediaType: "IMAGE" | "VIDEO";
		source: "default" | "selected" | "sku";
		skuId?: string;
	}> = [];

	// Set pour déduplication O(1) au lieu de O(n) avec array.find
	const seenUrls = new Set<string>();

	// Helper pour ajouter une image unique
	const addUniqueImage = (
		skuImage: {
			id: string;
			url: string;
			thumbnailUrl?: string | null;
			thumbnailSmallUrl?: string | null;
			blurDataUrl?: string | null;
			altText?: string | null;
			mediaType: "IMAGE" | "VIDEO";
		},
		alt: string,
		source: "default" | "selected" | "sku",
		skuId: string
	): boolean => {
		if (seenUrls.has(skuImage.url)) return false;
		seenUrls.add(skuImage.url);
		gallery.push({
			id: skuImage.id,
			url: skuImage.url,
			thumbnailUrl: skuImage.thumbnailUrl,
			thumbnailSmallUrl: skuImage.thumbnailSmallUrl,
			blurDataUrl: skuImage.blurDataUrl,
			alt: skuImage.altText || alt,
			mediaType: skuImage.mediaType,
			source,
			skuId,
		});
		return true;
	};

	// Priorité 1: Images du SKU sélectionné
	if (selectedSku?.images) {
		const altText = buildAltText(
			product.title,
			{ materialName: selectedSku.material?.name, colorName: selectedSku.color?.name },
			"Variante sélectionnée"
		);
		for (const skuImage of selectedSku.images) {
			addUniqueImage(skuImage, altText, "selected", selectedSku.id);
		}
	}

	// Priorité 2: Images du SKU par défaut (product.skus[0])
	const defaultSku = product.skus[0];
	if (defaultSku && defaultSku.id !== selectedSku?.id && defaultSku.images) {
		const altText = buildAltText(
			product.title,
			{ materialName: defaultSku.material?.name, colorName: defaultSku.color?.name },
			"Image principale"
		);
		for (const skuImage of defaultSku.images) {
			addUniqueImage(skuImage, altText, "default", defaultSku.id);
		}
	}

	// Priorité 3: Images des autres SKUs actifs
	if (gallery.length < MIN_GALLERY_IMAGES && product.skus) {
		for (const sku of product.skus.filter((s) => s.isActive)) {
			if (sku.id === selectedSku?.id || sku.id === defaultSku?.id) continue;
			if (gallery.length >= MAX_GALLERY_IMAGES) break;

			if (sku.images) {
				const altText = buildAltText(
					product.title,
					{ materialName: sku.material?.name, colorName: sku.color?.name },
					"Variante"
				);
				for (const skuImage of sku.images) {
					if (gallery.length >= MAX_GALLERY_IMAGES) break;
					addUniqueImage(skuImage, altText, "sku", sku.id);
				}
			}
		}
	}

	// Fallback: Si aucune image, utiliser l'image de fallback
	if (gallery.length === 0) {
		gallery.push({
			...FALLBACK_PRODUCT_IMAGE,
			alt: `${product.title} - ${FALLBACK_PRODUCT_IMAGE.alt}`,
			source: "default",
			skuId: undefined,
		});
	}

	// Convertir en ProductMedia format
	return gallery.map((img) => {
		return {
			id: img.id,
			url: img.url,
			thumbnailUrl: img.thumbnailUrl,
			thumbnailSmallUrl: img.thumbnailSmallUrl,
			blurDataUrl: img.blurDataUrl || undefined,
			alt: img.alt,
			mediaType: img.mediaType,
			source: img.source,
			skuId: img.skuId,
		};
	});
}
