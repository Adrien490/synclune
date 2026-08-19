/**
 * Construction de la galerie produit — schéma lean (lot 2) : le média vit sur
 * le PRODUIT, la galerie est simplement `product.media` ordonné (position asc),
 * avec ALT descriptifs générés pour les médias sans alt en base.
 */
import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import { MAX_GALLERY_IMAGES } from "@/modules/media/constants/media-limits.constants";
import { findVariantBySelectors } from "@/modules/variants/services/variant-finder.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

/**
 * ALT descriptif WCAG : "[Nom] en [Matériau] [Couleur] - Vue X sur Y".
 */
function buildAltText(
	productName: string,
	variantInfo?: {
		materialName?: string | null;
		colorName?: string | null;
	},
	imageIndex?: number,
	totalImages?: number,
): string {
	const { materialName, colorName } = variantInfo ?? {};

	const characteristics: string[] = [];
	if (materialName) characteristics.push(materialName);
	if (colorName && colorName !== materialName) characteristics.push(colorName);

	let description = productName;
	if (characteristics.length > 0) {
		description += ` en ${characteristics.join(" ")}`;
	}

	if (typeof imageIndex === "number" && typeof totalImages === "number" && totalImages > 1) {
		description += ` - Vue ${imageIndex + 1} sur ${totalImages}`;
	} else if (typeof imageIndex === "number" && imageIndex > 0) {
		description += ` - Photo ${imageIndex + 1}`;
	}

	return description;
}

interface BuildGalleryOptions {
	product: GetProductReturn;
	/**
	 * Sélection courante — enrichit les ALT générés avec matière/couleur de la
	 * variante AFFICHÉE. Même résolution que `resolveGalleryAccent` : ignorer
	 * la sélection citait toujours `variants[0]` (« en Argent Bleu » sur la
	 * photo affichée en rose — un ALT WCAG factuellement faux).
	 */
	selectedVariants?: {
		colorSlug?: string;
		materialSlug?: string;
		size?: string;
	};
}

/**
 * Construit la galerie du produit : `product.media` (déjà ordonné par le
 * select), plafonné à MAX_GALLERY_IMAGES, fallback SVG si vide.
 */
export function buildGallery({ product, selectedVariants }: BuildGalleryOptions): ProductMedia[] {
	const { colorSlug, materialSlug, size } = selectedVariants ?? {};
	const selectedVariant =
		colorSlug || materialSlug || size
			? findVariantBySelectors(product, { colorSlug, materialSlug, size })
			: null;
	const variant = selectedVariant ?? product.variants[0];
	const variantInfo = {
		materialName: variant?.material?.name ?? null,
		colorName: variant?.color?.name ?? null,
	};

	const media = product.media.slice(0, MAX_GALLERY_IMAGES);
	const totalImages = media.length;

	if (totalImages === 0) {
		return [
			{
				...FALLBACK_PRODUCT_IMAGE,
				alt: `${product.name} - Image bientôt disponible`,
			},
		];
	}

	return media.map((m, index) => ({
		id: m.id,
		url: m.url,
		type: m.type,
		blurDataUrl: m.blurDataUrl,
		position: m.position,
		alt: m.alt ?? buildAltText(product.name, variantInfo, index, totalImages),
		_hasCustomAlt: !!m.alt,
	}));
}
