import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// STOCK THRESHOLD CONSTANTS
// ============================================================================

/**
 * @deprecated Importer directement depuis "@/shared/constants/cache-tags"
 * Ce re-export est conservé pour la rétrocompatibilité mais sera supprimé
 * dans une future version.
 *
 * @example
 * // ❌ Ancien import (deprecated)
 * import { STOCK_THRESHOLDS } from "@/modules/skus/constants/inventory.constants";
 *
 * // ✅ Nouvel import recommandé
 * import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
 */
export { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";


// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_INVENTORY_SELECT = {
	id: true,
	sku: true,
	productId: true,
	inventory: true,
	product: {
		select: {
			id: true,
			slug: true,
			title: true,
			type: {
				select: {
					id: true,
					label: true,
				},
			},
		},
	},
	color: {
		select: {
			id: true,
			name: true,
		},
	},
	material: {
		select: {
			id: true,
			name: true,
		},
	},
	size: true,
} as const satisfies Prisma.ProductSkuSelect;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

export const GET_INVENTORY_DEFAULT_PER_PAGE = 50;
export const GET_INVENTORY_MAX_RESULTS_PER_PAGE = 200;

// ============================================================================
// SORT CONSTANTS
// ============================================================================

export const GET_INVENTORY_DEFAULT_SORT_BY = "available-ascending";

export const GET_INVENTORY_SORT_FIELDS = [
	"available-ascending",
	"available-descending",
	"sku-ascending",
	"sku-descending",
] as const;

export const INVENTORY_SORT_OPTIONS = {
	AVAILABLE_ASC: "available-ascending",
	AVAILABLE_DESC: "available-descending",
	SKU_ASC: "sku-ascending",
	SKU_DESC: "sku-descending",
} as const;

export const INVENTORY_SORT_LABELS = {
	[INVENTORY_SORT_OPTIONS.AVAILABLE_ASC]: "Stock disponible (ASC)",
	[INVENTORY_SORT_OPTIONS.AVAILABLE_DESC]: "Stock disponible (DESC)",
	[INVENTORY_SORT_OPTIONS.SKU_ASC]: "Référence (A-Z)",
	[INVENTORY_SORT_OPTIONS.SKU_DESC]: "Référence (Z-A)",
} as const;
