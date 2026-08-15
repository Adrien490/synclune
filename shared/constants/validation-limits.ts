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
	/** Taille VARIANT */
	VARIANT_SIZE: { max: 50 },
	// Volontairement plus strict que `ProductVariant.variant @db.VarChar(100)` : un code
	// technique lisible tient en 50, et la marge absorbe les suffixes `-COPY`.
	VARIANT_CODE: { max: 50 },
	/** Texte alternatif média */
	MEDIA_ALT_TEXT: { max: 200 },
	/**
	 * Terme de recherche — SSOT transverse (storefront ET listes admin).
	 *
	 * 100 est la borne EFFECTIVE de toute la chaîne : `splitSearchTerms` (fuzzy)
	 * rejette au-delà de `MAX_SEARCH_LENGTH` (= cette valeur), et le Zod du quick
	 * search aussi. Avant l'unification (audit recherche 2026-08-01, P3-1), trois
	 * bornes coexistaient (100/200/255) : une recherche PLP de 101-200 caractères
	 * passait le schéma puis `splitSearchTerms` → `[]` → TOUT le catalogue rendu
	 * comme « résultats de X » ; discounts 101-200 → liste vide + logger.error.
	 */
	SEARCH: { max: 100 },
	/** Recherche utilisateurs */
	USER_SEARCH: { max: 255 },
	/** Filtre string générique */
	FILTER_STRING: { max: 100 },
	/**
	 * URL de média — alignée sur `ProductMedia.url` / `ProductMedia.thumbnailUrl` et
	 * `OrderItem.productImageUrl`, tous `VarChar(2048)`.
	 *
	 * ⚠️ `z.url()` valide la FORME, jamais la longueur, et le refine de domaine
	 * autorisé ne borne que l'hôte : une URL d'un domaine légitime suivie d'une query
	 * string longue passait la validation puis débordait la colonne. 2048 est aussi
	 * la limite de fait des navigateurs et de `/_next/image`.
	 */
	MEDIA_URL: { max: 2048 },
} as const;

// ============================================================================
// LIMITES TABLEAUX
// ============================================================================

export const ARRAY_LIMITS = {
	/** Items de filtre */
	FILTER_ITEMS: 50,
	/** Collections par produit */
	PRODUCT_COLLECTIONS: 10,
	/** Médias par VARIANT (total) */
	VARIANT_MEDIA: 6,
	/** Médias galerie VARIANT (hors primaire) */
	VARIANT_GALLERY_MEDIA: 5,
	/** Matériaux par VARIANT (M2M ; 1er = principal pour SEO/care-tips) */
	VARIANT_MATERIALS: 3,
	/** Couleurs par VARIANT (M2M ; 1er = principal pour vignette listing/snapshot facture) */
	VARIANT_COLORS: 3,
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
	 * (`adjust-stock-form.tsx`, constante locale) : côté serveur, `stock` était
	 * `int().nonnegative()` sans `.max()`, et le CHECK DB ne borne que le plancher
	 * (`stock >= 0`). Un POST direct à `stock=2000000000` passait donc, et une
	 * telle ligne devient en plus injoignable par les filtres d'inventaire admin
	 * (bornés à `VARIANT_FILTERS_MAX_STOCK`). Valeur alignée sur celle que l'UI
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
