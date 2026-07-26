import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

/**
 * Tailles d'images compactes pour le mega menu navbar
 *
 * Container max-w-6xl (1152px) - padding lg:px-8 (64px) - gaps (36px)
 * = ~1052px utile / 4 colonnes = ~263px par carte max
 */
export const COLLECTION_IMAGE_SIZES_COMPACT = {
	SINGLE: "250px",
	BENTO_MAIN: "180px",
	BENTO_SECONDARY: "90px",
	TWO_IMAGES: "130px",
	THREE_IMAGES: "130px",
} as const;

/**
 * Qualite d'image standardisee pour les collections
 * Balance entre qualite visuelle et taille du fichier
 */
export const COLLECTION_IMAGE_QUALITY = IMAGE_QUALITY.STANDARD;

/**
 * Seuil above-the-fold — RE-EXPORT de la SSOT produits (valeur auparavant
 * dupliquee ici, libre de deriver). Ne pilote que `loading="eager"` : la priorite
 * reseau reste reservee au seul candidat LCP.
 */
export { ABOVE_FOLD_THRESHOLD } from "@/modules/products/constants/product-texts.constants";
