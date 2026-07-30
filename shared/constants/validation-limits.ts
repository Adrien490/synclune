/**
 * Constantes de validation centralisées
 * Utilisées dans les schemas Zod pour garantir la cohérence
 */

// ============================================================================
// LIMITES TEXTE
// ============================================================================

export const TEXT_LIMITS = {
	/** Titre produit */
	PRODUCT_TITLE: { min: 2, max: 200 },
	/** Description produit */
	PRODUCT_DESCRIPTION: { max: 500 },
	/** Taille SKU */
	SKU_SIZE: { max: 50 },
	/** Texte alternatif média */
	MEDIA_ALT_TEXT: { max: 200 },
	/** Recherche produits */
	PRODUCT_SEARCH: { max: 200 },
	/** Recherche utilisateurs */
	USER_SEARCH: { max: 255 },
	/** Filtre string générique */
	FILTER_STRING: { max: 100 },
} as const;

// ============================================================================
// LIMITES TABLEAUX
// ============================================================================

export const ARRAY_LIMITS = {
	/** Items de filtre */
	FILTER_ITEMS: 50,
	/** Collections par produit */
	PRODUCT_COLLECTIONS: 10,
	/** Médias par SKU (total) */
	SKU_MEDIA: 6,
	/** Médias galerie SKU (hors primaire) */
	SKU_GALLERY_MEDIA: 5,
	/** Matériaux par SKU (M2M ; 1er = principal pour SEO/care-tips) */
	SKU_MATERIALS: 3,
	/** Couleurs par SKU (M2M ; 1er = principal pour vignette listing/snapshot facture) */
	SKU_COLORS: 3,
} as const;

// ============================================================================
// LIMITES PRIX
// ============================================================================

export const PRICE_LIMITS = {
	/** Prix maximum en centimes */
	MAX_CENTS: 99999999,
	/** Prix maximum en euros */
	MAX_EUR: 999999.99,
	/** Prix maximum pour filtres (10 000€) */
	FILTER_MAX_CENTS: 1000000,
} as const;

// ============================================================================
// LIMITES STOCK
// ============================================================================

export const STOCK_LIMITS = {
	/**
	 * Stock maximum par variante.
	 *
	 * Le plafond n'existait QUE dans le formulaire d'ajustement
	 * (`adjust-stock-form.tsx`, constante locale) : côté serveur, `inventory` était
	 * `int().nonnegative()` sans `.max()`, et le CHECK DB ne borne que le plancher
	 * (`inventory >= 0`). Un POST direct à `inventory=2000000000` passait donc, et une
	 * telle ligne devient en plus injoignable par les filtres d'inventaire admin
	 * (bornés à `SKU_FILTERS_MAX_INVENTORY`). Valeur alignée sur celle que l'UI
	 * affichait déjà — c'est la borne annoncée à l'admin qui devient la borne réelle.
	 */
	MAX_INVENTORY: 99999,
} as const;

// ============================================================================
// LIMITES DATES
// ============================================================================

export const DATE_LIMITS = {
	/** Date minimum pour les filtres (lancement du site) */
	FILTERS_MIN: new Date("2020-01-01"),
} as const;
