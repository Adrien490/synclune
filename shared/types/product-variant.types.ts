/**
 * Types partagés entre les modules products et variants
 *
 * Ces types brisent la dépendance circulaire en fournissant des interfaces
 * de base que les deux modules peuvent importer depuis shared/.
 *
 * Schéma lean (lot 2) : une variante porte UNE couleur et UN matériau (FK
 * nullables), le média vit sur le PRODUIT, le prix de la variante est un
 * override optionnel du prix produit.
 */

// ============================================================================
// STOCK TYPES
// ============================================================================

/** Statut de stock */
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/** Informations de stock d'un produit */
export type ProductStockInfo = {
	status: StockStatus;
	totalStock: number;
	availableVariants: number;
	message: string;
};

// ============================================================================
// COLOR SWATCH
// ============================================================================

/**
 * Type pour les pastilles couleur sur ProductCard.
 * `slug` porte l'identité URL de la couleur — depuis le schéma lean c'est le
 * NOM de la couleur (Color n'a plus de colonne slug), encodé par l'appelant.
 */
export type ColorSwatch = {
	slug: string;
	hex: string;
	name: string;
	inStock: boolean;
};

// ============================================================================
// BASE INTERFACES FOR VARIANT SELECTION
// ============================================================================

/** Forme minimale d'une variante pour les fonctions de sélection/affichage */
export interface BaseVariantForList {
	active: boolean;
	stock: number;
	/** Override du prix produit — null = prix du produit */
	priceCents: number | null;
	color: {
		id: string;
		hex: string | null;
		name: string;
	} | null;
	material: {
		id: string;
		name: string;
	} | null;
}

/** Forme minimale d'une variante détaillée (page produit) */
export interface BaseProductVariant extends BaseVariantForList {
	id: string;
	size: string | null;
}

// ============================================================================
// VARIANT INFO (pour extract-variant-info)
// ============================================================================

/** Informations sur les variantes d'un produit */
export type ProductVariantInfo = {
	availableColors: Array<{
		id: string;
		slug?: string;
		hex?: string;
		name: string;
		availableVariants: number;
	}>;
	availableMaterials: Array<{
		name: string;
		availableVariants: number;
	}>;
	availableSizes: Array<{
		size: string;
		availableVariants: number;
	}>;
	priceRange: {
		min: number;
		max: number;
	};
	totalStock: number;
};
