import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import { findSkuByVariants } from "@/modules/skus/services/sku-variant-finder.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

/** Maximum number of images in the gallery */
const MAX_GALLERY_IMAGES = 20;

/** Minimum number of images before searching other SKUs */
const MIN_GALLERY_IMAGES = 5;

/**
 * Generates a descriptive alt text for a media item following the recommended WCAG format:
 * "[Type bijou] [Titre] en [Matériau] [Couleur] - [Vue/Index]"
 *
 * @example
 * buildAltText("Éclat de Lune", { productType: "Boucles d'oreilles", materialName: "Or", colorName: "Rose" }, 1, 5)
 * // => "Boucles d'oreilles Éclat de Lune en Or Rose - Vue 1 sur 5"
 */
function buildAltText(
	productTitle: string,
	variantInfo?: {
		productType?: string | null;
		materialName?: string | null;
		colorName?: string | null;
		size?: string | null;
	},
	imageIndex?: number,
	totalImages?: number
): string {
	const { productType, materialName, colorName, size } = variantInfo || {};

	// Build prefix with jewelry type
	const prefix = productType ? `${productType} ${productTitle}` : productTitle;

	// Build jewelry characteristics
	const characteristics: string[] = [];
	if (materialName) characteristics.push(materialName);
	if (colorName && colorName !== materialName) characteristics.push(colorName);
	if (size) characteristics.push(`Taille ${size}`);

	// Build the descriptive part
	let description = prefix;
	if (characteristics.length > 0) {
		description += ` en ${characteristics.join(" ")}`;
	}

	// Add view index if available
	if (typeof imageIndex === "number" && typeof totalImages === "number" && totalImages > 1) {
		description += ` - Vue ${imageIndex + 1} sur ${totalImages}`;
	} else if (typeof imageIndex === "number") {
		description += ` - Photo ${imageIndex + 1}`;
	}

	return description;
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
 * Builds the product image/video gallery by priority:
 * 1. Selected SKU images (variants)
 * 2. Default SKU images (product.skus[0])
 * 3. Other active SKU images (max MAX_GALLERY_IMAGES total)
 * 4. Fallback image if none available
 *
 * @param options - Gallery build options
 * @returns Array of ProductMedia objects ordered by priority
 */
export function buildGallery({
	product,
	selectedVariants,
}: BuildGalleryOptions): ProductMedia[] {
	// Safety check: return empty array if no product
	if (!product) {
		return [];
	}

	const { colorSlug, materialSlug, size } = selectedVariants;

	// Find the SKU matching the selected variants
	const selectedSku =
		colorSlug || materialSlug || size
			? findSkuByVariants(product, {
					colorSlug: colorSlug || undefined,
					materialSlug: materialSlug || undefined,
					size: size || undefined,
				})
			: null;

	// Build the gallery with ProductMedia type directly
	const gallery: ProductMedia[] = [];

	// Set for O(1) deduplication instead of O(n) with array.find
	const seenUrls = new Set<string>();

	// Product type for descriptive ALT texts
	const productType = product.type?.label;

	// Helper to add a unique image with descriptive ALT
	const addUniqueImage = (
		skuImage: {
			id: string;
			url: string;
			thumbnailUrl?: string | null;
			blurDataUrl?: string | null;
			altText?: string | null;
			mediaType: "IMAGE" | "VIDEO";
		},
		variantInfo: {
			materialName?: string | null;
			colorName?: string | null;
			size?: string | null;
		},
		source: ProductMedia["source"],
		skuId: string
	): boolean => {
		if (seenUrls.has(skuImage.url)) return false;
		seenUrls.add(skuImage.url);

		// Generate descriptive ALT text (index will be updated after full gallery construction)
		const generatedAlt = buildAltText(
			product.title,
			{
				productType,
				...variantInfo,
			},
			gallery.length // Current index in the gallery
		);

		gallery.push({
			id: skuImage.id,
			url: skuImage.url,
			thumbnailUrl: skuImage.thumbnailUrl,
			blurDataUrl: skuImage.blurDataUrl || undefined,
			alt: skuImage.altText || generatedAlt,
			mediaType: skuImage.mediaType,
			source,
			skuId,
		});
		return true;
	};

	// Priority 1: Selected SKU images
	if (selectedSku?.images) {
		const variantInfo = {
			materialName: selectedSku.material?.name,
			colorName: selectedSku.color?.name,
			size: selectedSku.size,
		};
		for (const skuImage of selectedSku.images) {
			if (gallery.length >= MAX_GALLERY_IMAGES) break;
			addUniqueImage(skuImage, variantInfo, "selected", selectedSku.id);
		}
	}

	// Priority 2: Default SKU images (product.skus[0])
	const defaultSku = product.skus[0];
	if (defaultSku && defaultSku.id !== selectedSku?.id && defaultSku.images) {
		const variantInfo = {
			materialName: defaultSku.material?.name,
			colorName: defaultSku.color?.name,
			size: defaultSku.size,
		};
		for (const skuImage of defaultSku.images) {
			if (gallery.length >= MAX_GALLERY_IMAGES) break;
			addUniqueImage(skuImage, variantInfo, "default", defaultSku.id);
		}
	}

	// Priority 3: Other active SKU images
	if (gallery.length < MIN_GALLERY_IMAGES && product.skus) {
		for (const sku of product.skus.filter((s) => s.isActive)) {
			if (sku.id === selectedSku?.id || sku.id === defaultSku?.id) continue;
			if (gallery.length >= MAX_GALLERY_IMAGES) break;

			if (sku.images) {
				const variantInfo = {
					materialName: sku.material?.name,
					colorName: sku.color?.name,
					size: sku.size,
				};
				for (const skuImage of sku.images) {
					if (gallery.length >= MAX_GALLERY_IMAGES) break;
					addUniqueImage(skuImage, variantInfo, "sku", sku.id);
				}
			}
		}
	}

	// Fallback: Use fallback image if none available
	if (gallery.length === 0) {
		const fallbackAlt = productType
			? `${productType} ${product.title} - Image bientôt disponible`
			: `${product.title} - Image bientôt disponible`;
		gallery.push({
			...FALLBACK_PRODUCT_IMAGE,
			alt: fallbackAlt,
			source: "default",
			skuId: undefined,
		});
	}

	// Update ALTs with total image count for "Vue X sur Y" format
	const totalImages = gallery.length;
	if (totalImages > 1) {
		for (let i = 0; i < gallery.length; i++) {
			const media = gallery[i];
			// Only update generated ALTs (not manually defined ones from DB)
			if (media && !media.alt.includes(" sur ") && media.alt.includes("Photo ")) {
				media.alt = media.alt.replace(
					/Photo (\d+)$/,
					`Vue $1 sur ${totalImages}`
				);
			}
		}
	}

	return gallery;
}
