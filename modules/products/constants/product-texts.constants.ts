/**
 * Constantes et textes pour les produits Synclune
 * Centralisation pour éviter les hardcoded strings et faciliter l'i18n future
 */

import { PREPARATION_DELAY_LABEL } from "@/modules/orders/constants/shipping-rates";
import { SYSTEM_PRODUCT_TYPE_SLUGS } from "@/modules/product-types/constants/system-product-type-slugs";
import { prefixWithProductType } from "@/modules/products/utils/product-type-prefix";

export const PRODUCT_TEXTS = {
	// Descriptions par défaut
	DEFAULT_DESCRIPTION:
		"Ce bijou artisanal est créé à la main avec amour dans l'atelier Synclune. Chaque pièce est unique et porte en elle toute la passion de l'artisan bijoutier.",

	// Informations de livraison
	SHIPPING: {
		PREPARATION: `Préparation artisanale sous ${PREPARATION_DELAY_LABEL}`,
		TRACKING: "Envoi suivi",
		ZONES: "France et Union Européenne",
	},

	// Messages de stock
	STOCK: {
		IN_STOCK: "En stock",
		LOW_STOCK: "Stock limité",
		/** Badge d'urgence de la carte produit — compte du SKU affiché */
		LOW_STOCK_LEFT: (count: number) => `Plus que ${count} !`,
		OUT_OF_STOCK: "Rupture de stock",
		ON_DEMAND: "Sur commande",
		COMING_SOON: "Bientôt disponible",
	},

	// Prix et promotions
	PRICING: {
		FROM: "À partir de",
		ORIGINAL_PRICE: "Prix initial",
		CURRENT_PRICE: "Prix actuel",
		SAVINGS: (amount: string) => `Tu économises ${amount}`,
		PRICE_ON_REQUEST: "Prix sur demande",
	},

	// Matériaux et qualité
	MATERIALS: {
		HANDMADE: "Fait main",
		ARTISAN_QUALITY: "Qualité artisanale",
		FRENCH_CRAFTSMANSHIP: "Savoir-faire français",
		UNIQUE_PIECE: "Pièce unique",
		LIMITED_EDITION: "Édition limitée",
	},

	// Images et médias - Format WCAG : "[Type bijou] [Titre] en [Matériau] [Couleur] - Vue [X sur Y]"
	IMAGES: {
		/**
		 * ALT par défaut pour les images produit
		 * Format: "[Type] [Titre] - Bijou artisanal fait main par Synclune"
		 */
		DEFAULT_ALT: (title: string, productType?: string) =>
			`${prefixWithProductType(title, productType)} - Bijou artisanal fait main par Synclune`,

		/**
		 * ALT pour image placeholder/non disponible
		 */
		PLACEHOLDER_ALT: (title: string, productType?: string) =>
			`${prefixWithProductType(title, productType)} - Image bientôt disponible`,

		/**
		 * ALT pour les images de la galerie principale
		 * Format: "[Type] [Titre] - Vue [index] sur [total]"
		 */
		GALLERY_MAIN_ALT: (title: string, index: number, total?: number, productType?: string) => {
			const prefix = prefixWithProductType(title, productType);
			const viewInfo = total && total > 1 ? `Vue ${index} sur ${total}` : `Photo ${index}`;
			return `${prefix} - ${viewInfo}`;
		},

		/**
		 * ALT pour les miniatures de la galerie
		 */
		GALLERY_THUMBNAIL_ALT: (
			title: string,
			index: number,
			isVideo = false,
			productType?: string,
		) => {
			const prefix = prefixWithProductType(title, productType);
			const mediaType = isVideo ? "Vidéo" : "Miniature";
			return `${prefix} - ${mediaType} ${index}`;
		},
	},

	// Actions utilisateur
	ACTIONS: {
		ADD_TO_CART: "Ajouter au panier",
		BUY_NOW: "Acheter maintenant",
		CONTACT_US: "Nous contacter",
		VIEW_DETAILS: "Voir les détails",
		SHARE: "Partager",
		ADD_TO_WISHLIST: "Ajouter aux favoris",
	},

	// Erreurs et états
	ERRORS: {
		PRODUCT_NOT_FOUND: "Produit non trouvé",
		LOADING_ERROR: "Erreur lors du chargement",
		NETWORK_ERROR: "Problème de connexion",
		VARIANT_UNAVAILABLE: "Cette variante n'est plus disponible",
		VALIDATION_ERROR: "Erreur de validation des données",
		PERMISSION_DENIED: "Accès non autorisé",
		IMAGE_UNAVAILABLE: "Image non disponible",
	},

	// Navigation et breadcrumbs
	NAVIGATION: {
		BACK_TO_SHOP: "Retour à la boutique",
		RELATED_PRODUCTS: "Produits similaires",
		SAME_COLLECTION: "Même collection",
		RECOMMENDATIONS: "Nos recommandations",
	},

	// Réseaux sociaux et partage
	SOCIAL: {
		SHARE_ON_INSTAGRAM: "Partager sur Instagram",
		FOLLOW_US: "Suivez-nous sur Instagram",
		TAG_US: "Taguez-nous dans vos photos !",
		HASHTAG: "#SyncluneBijoux",
	},
} as const;

/**
 * Types de produits qui nécessitent obligatoirement une taille
 * (sauf si la taille est ajustable)
 *
 * ⚠️ Les valeurs DÉRIVENT de la SSOT `SYSTEM_PRODUCT_TYPE_SLUGS`, elles ne sont
 * jamais réécrites en littéral : la version précédente disait `["ring", "bracelet"]`
 * — en anglais, au singulier — sous un commentaire « aligné avec les slugs en base »
 * qui était faux. L'intersection avec `bagues` / `bracelets` étant vide, le sélecteur
 * de taille n'était JAMAIS rendu, et le SKU envoyé au panier était le premier venu.
 */
export const PRODUCT_TYPES_REQUIRING_SIZE = [
	SYSTEM_PRODUCT_TYPE_SLUGS.RINGS,
	SYSTEM_PRODUCT_TYPE_SLUGS.BRACELETS,
] as const;

/**
 * Configuration des tailles d'images optimisées pour performance
 */
export const IMAGE_SIZES = {
	// Card max width on desktop wide = 224px; hover scale x1.02 ≈ 228px. 256px covers retina (dpr 2 ≈ 512px source).
	PRODUCT_CARD:
		"(max-width: 767px) 45vw, (max-width: 1023px) 30vw, (max-width: 1279px) 22vw, 256px",
	PRODUCT_THUMBNAIL: "120px",
} as const;

/**
 * Messages de validation pour les formulaires
 */
// ============================================================================
// PRODUCT CARD DISPLAY
// ============================================================================

/** Maximum number of color swatches to display on a product card */
export const MAX_COLOR_SWATCHES = 5;

/**
 * Number of cards considered above-fold for eager image loading.
 *
 * SSOT partagée avec les collections (`modules/collections/constants/image-sizes.constants`
 * la ré-exporte) : la valeur était dupliquée dans les deux modules et pouvait
 * dériver silencieusement.
 *
 * ⚠️ Ce seuil ne pilote QUE `loading="eager"`. La priorité réseau
 * (`preload` + `fetchPriority="high"`) est réservée au SEUL candidat LCP —
 * l'accorder aux 4 cartes créait une contention de bande passante sur 4G.
 */
export const ABOVE_FOLD_THRESHOLD = 4;
