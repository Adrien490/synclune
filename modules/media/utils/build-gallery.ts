import { FALLBACK_PRODUCT_IMAGE } from "@/modules/media/constants/product-fallback-image.constants";
import { findSkuByVariants } from "@/modules/skus/services/find-sku-by-variants";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

/** Nombre maximum d'images dans la galerie */
const MAX_GALLERY_IMAGES = 20;

/** Nombre minimum d'images avant de chercher dans les autres SKUs */
const MIN_GALLERY_IMAGES = 5;

/**
 * Génère un alt text descriptif pour un média selon le format WCAG recommandé:
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

	// Construire le préfixe avec le type de bijou
	const prefix = productType ? `${productType} ${productTitle}` : productTitle;

	// Construire les caractéristiques du bijou
	const characteristics: string[] = [];
	if (materialName) characteristics.push(materialName);
	if (colorName && colorName !== materialName) characteristics.push(colorName);
	if (size) characteristics.push(`Taille ${size}`);

	// Construire la partie descriptive
	let description = prefix;
	if (characteristics.length > 0) {
		description += ` en ${characteristics.join(" ")}`;
	}

	// Ajouter l'index de vue si disponible
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

	// Type de produit pour les ALT texts descriptifs
	const productType = product.type?.label;

	// Helper pour ajouter une image unique avec ALT descriptif
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

		// Générer l'ALT text descriptif (l'index sera mis à jour après la construction complète)
		const generatedAlt = buildAltText(
			product.title,
			{
				productType,
				...variantInfo,
			},
			gallery.length // Index actuel dans la galerie
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

	// Priorité 1: Images du SKU sélectionné
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

	// Priorité 2: Images du SKU par défaut (product.skus[0])
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

	// Priorité 3: Images des autres SKUs actifs
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

	// Fallback: Si aucune image, utiliser l'image de fallback
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

	// Mettre à jour les ALT avec le nombre total d'images pour "Vue X sur Y"
	const totalImages = gallery.length;
	if (totalImages > 1) {
		for (let i = 0; i < gallery.length; i++) {
			const media = gallery[i];
			// Ne mettre à jour que les ALT générés (pas ceux définis manuellement dans la DB)
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
