/**
 * Constantes et textes pour les produits Synclune
 * Centralisation pour éviter les hardcoded strings et faciliter l'i18n future
 */

export const PRODUCT_TEXTS = {
	// Descriptions par défaut
	DEFAULT_DESCRIPTION:
		"Ce bijou artisanal est créé à la main avec amour dans l'atelier Synclune. Chaque pièce est unique et porte en elle toute la passion de l'artisan bijoutier.",

	// Informations de livraison
	SHIPPING: {
		PREPARATION: "Préparation artisanale sous 2 à 4 jours ouvrés",
		TRACKING: "Envoi suivi",
		ZONES: "France et Union Européenne",
	},

	// Messages de stock
	STOCK: {
		IN_STOCK: "En stock",
		LOW_STOCK: "Stock limité",
		OUT_OF_STOCK: "Rupture de stock",
		ON_DEMAND: "Sur commande",
	},

	// Messages de personnalisation
	CUSTOMIZATION: {
		AVAILABLE: "Personnalisation disponible",
		ENGRAVING: "Gravure possible",
		CUSTOM_ORDER: "Création sur mesure",
		CONTACT_FOR_CUSTOM: "Contactez-nous pour une création personnalisée",
		ENGRAVING_DELAY: "Délai supplémentaire de 2-3 jours pour la gravure",
	},

	// Prix et promotions
	PRICING: {
		FROM: "À partir de",
		ORIGINAL_PRICE: "Prix initial",
		CURRENT_PRICE: "Prix actuel",
		SAVINGS: (amount: string) => `Économisez ${amount}`,
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
			productType
				? `${productType} ${title} - Bijou artisanal fait main par Synclune`
				: `${title} - Bijou artisanal fait main par Synclune`,

		/**
		 * ALT pour image placeholder/non disponible
		 */
		PLACEHOLDER_ALT: (title: string, productType?: string) =>
			productType
				? `${productType} ${title} - Image bientôt disponible`
				: `${title} - Image bientôt disponible`,

		/**
		 * ALT pour les images de la galerie principale
		 * Format: "[Type] [Titre] - Vue [index] sur [total]"
		 */
		GALLERY_MAIN_ALT: (title: string, index: number, total?: number, productType?: string) => {
			const prefix = productType ? `${productType} ${title}` : title;
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
			const prefix = productType ? `${productType} ${title}` : title;
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
 * Configuration des types de produits avec leurs caractéristiques
 */
export const PRODUCT_TYPE_CONFIG = {
	EARRINGS: {
		name: "Boucles d'oreilles",
		emoji: "💎",
		defaultWeight: 8.5,
		category: "accessories",
	},
	RINGS: {
		name: "Bagues",
		emoji: "💍",
		defaultWeight: 5.2,
		category: "jewelry",
	},
	NECKLACES: {
		name: "Colliers",
		emoji: "📿",
		defaultWeight: 15.3,
		category: "jewelry",
	},
	BRACELETS: {
		name: "Bracelets",
		emoji: "🔗",
		defaultWeight: 12.8,
		category: "accessories",
	},
	ENGRAVINGS: {
		name: "Gravures",
		emoji: "✨",
		defaultWeight: 0,
		category: "services",
	},
} as const;

/**
 * Types de produits qui nécessitent obligatoirement une taille
 * (sauf si la taille est ajustable)
 * ⚠️ Aligné avec les slugs en base de données (lowercase)
 */
export const PRODUCT_TYPES_REQUIRING_SIZE = ["ring", "bracelet"] as const;

/**
 * Type helper pour les types de produits nécessitant une taille
 */
export type ProductTypeRequiringSize = (typeof PRODUCT_TYPES_REQUIRING_SIZE)[number];

/**
 * Configuration des tailles d'images optimisées pour performance
 */
export const IMAGE_SIZES = {
	PRODUCT_CARD:
		"(max-width: 767px) 45vw, (max-width: 1023px) 30vw, (max-width: 1279px) 22vw, 340px",
	PRODUCT_GALLERY: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px",
	PRODUCT_THUMBNAIL: "120px",
} as const;

/**
 * Messages de validation pour les formulaires
 */
export const VALIDATION_MESSAGES = {
	REQUIRED_FIELD: "Ce champ est obligatoire",
	EMAIL_INVALID: "Adresse email invalide",
	TEXT_TOO_LONG: (max: number) => `Maximum ${max} caractères`,
	TEXT_TOO_SHORT: (min: number) => `Minimum ${min} caractères`,
	INVALID_SELECTION: "Sélection invalide",
	CUSTOMIZATION_REQUIRED: "Veuillez compléter la personnalisation",
} as const;

/**
 * Configuration des délais de livraison
 * @deprecated Utiliser les tarifs Stripe configurés dans le Dashboard
 * @see shared/lib/shipping/stripe-shipping-rates.ts
 *
 * Les frais de livraison sont gérés dynamiquement via Stripe Shipping Rates
 * et calculés au moment du paiement selon la destination du client.
 */
export const DELIVERY_CONFIG = {
	FRANCE: {
		name: "France métropolitaine",
		delay: "2-3 jours ouvrés",
		description: "Préparation artisanale puis envoi suivi",
	},
	EU: {
		name: "Union Européenne",
		delay: "4-7 jours ouvrés",
		description: "Envoi suivi vers l'Union Européenne",
	},
} as const;
