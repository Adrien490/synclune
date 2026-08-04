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
 * Tailles d'images de la carte planche-contact (`/collections`).
 *
 * ## Pourquoi une queue en px fixe, et pas en `vw`
 *
 * La grille est `grid-cols-1 xs:grid-cols-2 md:grid-cols-3` dans un conteneur
 * `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` : **au-delà de 1152px la carte ne
 * grandit plus**, alors qu'une déclaration en `vw` continue de croître avec le
 * viewport. Les valeurs précédentes finissaient toutes en `vw` et
 * surdéclaraient d'un facteur 3 à 4 sur un écran large (`33vw` = 634px à
 * 1920px pour une image qui en fait 165) — autant de transformations
 * `/_next/image` payées pour des pixels jetés. Même méthode que
 * `IMAGE_SIZES.PRODUCT_CARD` et que le bloc COMPACT ci-dessus.
 *
 * ## L'arithmétique (largeur du BLOC MÉDIA, = carte − padding du cadre)
 *
 * | viewport      | col. | carte              | média (− 16/20px) |
 * | ------------- | ---- | ------------------ | ----------------- |
 * | < 375         | 1    | vw − 32            | ~100vw            |
 * | 375 → 767     | 2    | (vw − 48…72) / 2   | ~47vw             |
 * | 768 → 1151    | 3    | (vw − 96…128) / 3  | ~31vw             |
 * | ≥ 1152        | 3    | (1152 − 128) / 3   | **321px**         |
 *
 * Le plafond réel est donc 321px ; on déclare 340px pour couvrir le zoom au
 * survol (`scale-[1.08]` sur l'image) sans repasser en `vw`.
 *
 * Les fractions ci-dessous suivent les layouts de `collection-images-grid.tsx` :
 * le bento est en 2×2 sous `sm` (chaque tuile = 1/2 du média) puis en
 * `2fr_1fr` × 3 rangées au-dessus (principale = 2/3, secondaires = 1/3) ; les
 * layouts 2 et 3 images posent des cellules de 1/2 média à tous les viewports.
 */
export const COLLECTION_IMAGE_SIZES_CARD = {
	/** Bloc média entier — layout à 1 image. */
	FULL: "(max-width: 374px) 100vw, (max-width: 767px) 47vw, (max-width: 1151px) 31vw, 340px",
	/** Bento, image principale : 1/2 du média sous `sm`, 2/3 au-dessus. */
	BENTO_MAIN:
		"(max-width: 374px) 50vw, (max-width: 639px) 24vw, (max-width: 767px) 31vw, (max-width: 1151px) 21vw, 230px",
	/** Bento, vignettes : 1/2 du média sous `sm`, 1/3 au-dessus. */
	BENTO_SECONDARY:
		"(max-width: 374px) 50vw, (max-width: 639px) 24vw, (max-width: 767px) 16vw, (max-width: 1151px) 11vw, 115px",
	/** Layouts 2 et 3 images : toutes les cellules font 1/2 du média. */
	HALF: "(max-width: 374px) 50vw, (max-width: 767px) 24vw, (max-width: 1151px) 16vw, 175px",
	/**
	 * 4ᵉ vignette du bento, `hidden sm:block` : `0px` sous `sm` fait choisir au
	 * navigateur le plus petit candidat du `srcset` s'il décide malgré tout de
	 * télécharger l'image d'un conteneur masqué.
	 */
	BENTO_SECONDARY_HIDDEN_MOBILE:
		"(max-width: 639px) 0px, (max-width: 767px) 16vw, (max-width: 1151px) 11vw, 115px",
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
