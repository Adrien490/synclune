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
	/**
	 * Hex codes ordonnés par position (présent si la pastille représente une
	 * combinaison M2M ; absent ou de longueur 1 pour une couleur mono).
	 */
	hexes?: string[];
	/**
	 * Clé canonique de la combinaison (slugs triés alphabétiquement, séparés
	 * par "__"). Présent uniquement pour les combos multi-couleur ; permet
	 * `?variant=or-rose__argent` côté URL.
	 */
	comboKey?: string;
	/** Noms ordonnés par position (parité hexes), utilisés pour aria-label. */
	names?: string[];
};

// ============================================================================
// BASE INTERFACES FOR SKU SELECTION
// Ces interfaces définissent la forme minimale requise par les services skus
// sans dépendre des types Prisma de products
// ============================================================================

/** Forme minimale d'un SKU pour les fonctions de sélection */
export interface BaseSkuForList {
	isActive: boolean;
	/**
	 * Rang éditorial de la variante — le représentant du produit est le rang 0
	 * de `(position asc, id asc)` (remplace `isDefault`, audit schéma V5, lot A2).
	 * Les selects catalogue livrent déjà les SKUs dans cet ordre.
	 */
	position: number;
	inventory: number;
	priceInclTax: number;
	compareAtPrice: number | null;
	/** Couleurs M2M ordonnées (1re = principale). Vide = aucune couleur renseignée. */
	colors: Array<{
		colorId: string;
		position: number;
		color: {
			id: string;
			slug: string;
			hex: string;
			name: string;
		};
	}>;
	materials: Array<{
		materialId: string;
		position: number;
		material: {
			id: string;
			name: string;
		};
	}>;
	images: Array<{
		id: string;
		url: string;
		thumbnailUrl: string | null;
		altText: string | null;
		mediaType: "IMAGE" | "VIDEO";
		blurDataUrl: string | null;
	}>;
}

/** Forme minimale d'un produit pour les fonctions de sélection */
interface BaseProductForList {
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
interface BaseProductDetailed {
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
	availableCombos: ColorCombo[];
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

// ============================================================================
// COLOR COMBO (M2M ProductSkuColor — combinaison de teintes par SKU)
// ============================================================================

/**
 * Représentation d'une combinaison de couleurs portée par un ou plusieurs SKUs.
 *
 * Convention :
 * - `hexes` et `names` sont ordonnés par `position` (1ère = principale).
 * - `comboKey` est stable (slugs triés alphabétiquement, séparateur "__") pour
 *   permettre la déduplication entre SKUs et le routage URL `?variant=`.
 */
export type ColorCombo = {
	comboKey: string;
	colors: Array<{
		id: string;
		slug: string;
		hex: string;
		name: string;
		position: number;
	}>;
	hexes: string[];
	names: string[];
	/** Libellé d'affichage joint par " + " (ex. "Or rose + Argent"). */
	label: string;
	/** Libellé accessible joint par " et " (ex. "Or rose et Argent"). */
	ariaLabel: string;
	inStock: boolean;
	skuCount: number;
};
