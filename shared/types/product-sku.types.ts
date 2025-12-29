/**
 * Types partagés entre les modules products et skus
 *
 * Ces types brisent la dépendance circulaire en fournissant des interfaces
 * de base que les deux modules peuvent importer depuis shared/
 */

// ============================================================================
// STOCK TYPES
// ============================================================================

/** Statut de stock */
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/** Informations de stock d'un produit */
export type ProductStockInfo = {
	status: StockStatus;
	totalInventory: number;
	availableSkus: number;
	message: string;
};

// ============================================================================
// COLOR SWATCH
// ============================================================================

/** Type pour les pastilles couleur sur ProductCard */
export type ColorSwatch = {
	slug: string;
	hex: string;
	name: string;
	inStock: boolean;
};

// ============================================================================
// BASE INTERFACES FOR SKU SELECTION
// Ces interfaces définissent la forme minimale requise par les services skus
// sans dépendre des types Prisma de products
// ============================================================================

/** Forme minimale d'un SKU pour les fonctions de sélection */
export interface BaseSkuForList {
	isActive: boolean;
	isDefault: boolean;
	inventory: number;
	priceInclTax: number;
	compareAtPrice: number | null;
	color: {
		id: string;
		slug: string;
		hex: string;
		name: string;
	} | null;
	material: {
		id: string;
		name: string;
	} | null;
	images: Array<{
		id: string;
		url: string;
		thumbnailUrl: string | null;
		altText: string | null;
		isPrimary: boolean;
		mediaType: "IMAGE" | "VIDEO";
		blurDataUrl: string | null;
	}>;
}

/** Forme minimale d'un produit pour les fonctions de sélection */
export interface BaseProductForList {
	slug: string;
	title: string;
	skus?: BaseSkuForList[] | null;
}

// ============================================================================
// BASE INTERFACES FOR DETAILED PRODUCT/SKU
// ============================================================================

/** Forme minimale d'un SKU détaillé (page produit) */
export interface BaseProductSku extends BaseSkuForList {
	id: string;
	sku: string;
	size: string | null;
}

/** Forme minimale d'un produit détaillé */
export interface BaseProductDetailed {
	skus?: BaseProductSku[] | null;
}

// ============================================================================
// VARIANT INFO (pour extract-sku-info)
// ============================================================================

/** Informations sur les variantes d'un produit */
export type ProductVariantInfo = {
	availableColors: Array<{
		id: string;
		slug?: string;
		hex?: string;
		name: string;
		availableSkus: number;
	}>;
	availableMaterials: Array<{
		name: string;
		availableSkus: number;
	}>;
	availableSizes: Array<{
		size: string;
		availableSkus: number;
	}>;
	priceRange: {
		min: number;
		max: number;
	};
	totalStock: number;
};
