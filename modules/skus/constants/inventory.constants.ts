import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// STOCK THRESHOLD CONSTANTS
// ============================================================================

/**
 * Seuil de stock bas - un SKU est considéré en "low stock"
 * quand son inventaire est strictement inférieur à ce seuil.
 *
 * Utilisé pour :
 * - Affichage d'alertes sur la boutique
 * - Alertes stock dans le dashboard admin
 */
export const LOW_STOCK_THRESHOLD = 3;

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
	material: true,
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
