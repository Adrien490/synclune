import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import { findSkuByVariants } from "@/modules/skus/services/find-sku-by-variants";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

/** Nombre maximum d'images dans la galerie */
const MAX_GALLERY_IMAGES = 20;

/** Nombre minimum d'images avant de chercher dans les autres SKUs */
const MIN_GALLERY_IMAGES = 5;

/**
 * Génère un alt text propre pour un média
 * Évite les textes mal formés quand material/color/size sont undefined
 * Inclut la taille pour les bijoux (important pour accessibilité)
 */
function buildAltText(
	productTitle: string,
	variantInfo?: { materialName?: string | null; colorName?: string | null; size?: string | null },
	fallbackSuffix = "Photo produit"
): string {
	const { materialName, colorName, size } = variantInfo || {};

	// Construire les parties du suffixe
	const parts: string[] = [];
	if (materialName) parts.push(materialName);
	if (colorName && colorName !== materialName) parts.push(colorName);
	if (size) parts.push(`Taille ${size}`);

	// Utiliser les parties ou le fallback
	const suffix = parts.length > 0 ? parts.join(" - ") : fallbackSuffix;

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

	// Construire la galerie avec type ProductMedia directement
	const gallery: ProductMedia[] = [];

	// Set pour déduplication O(1) au lieu de O(n) avec array.find
	const seenUrls = new Set<string>();

	// Helper pour ajouter une image unique (type aligne avec ProductMedia)
	const addUniqueImage = (
		skuImage: {
			id: string;
			url: string;
			thumbnailUrl?: string | null;
			blurDataUrl?: string | null;
			altText?: string | null;
			mediaType: "IMAGE" | "VIDEO";
		},
		alt: string,
		source: ProductMedia["source"],
		skuId: string
	): boolean => {
		if (seenUrls.has(skuImage.url)) return false;
		seenUrls.add(skuImage.url);
		gallery.push({
			id: skuImage.id,
			url: skuImage.url,
			thumbnailUrl: skuImage.thumbnailUrl,
			blurDataUrl: skuImage.blurDataUrl || undefined,
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
			{
				materialName: selectedSku.material?.name,
				colorName: selectedSku.color?.name,
				size: selectedSku.size,
			},
			"Variante sélectionnée"
		);
		for (const skuImage of selectedSku.images) {
			if (gallery.length >= MAX_GALLERY_IMAGES) break;
			addUniqueImage(skuImage, altText, "selected", selectedSku.id);
		}
	}

	// Priorité 2: Images du SKU par défaut (product.skus[0])
	const defaultSku = product.skus[0];
	if (defaultSku && defaultSku.id !== selectedSku?.id && defaultSku.images) {
		const altText = buildAltText(
			product.title,
			{
				materialName: defaultSku.material?.name,
				colorName: defaultSku.color?.name,
				size: defaultSku.size,
			},
			"Image principale"
		);
		for (const skuImage of defaultSku.images) {
			if (gallery.length >= MAX_GALLERY_IMAGES) break;
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
					{
						materialName: sku.material?.name,
						colorName: sku.color?.name,
						size: sku.size,
					},
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

	return gallery;
}
