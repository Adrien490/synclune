import { Prisma } from "@/app/generated/prisma";

// ============================================================================
// STOCK THRESHOLD CONSTANTS
// ============================================================================

/**
 * Seuils de stock centralisés pour tout le module SKUs.
 * Ces valeurs sont utilisées pour :
 * - Filtrage dans l'inventaire admin (critical, low, normal, high)
 * - Affichage d'alertes sur la boutique
 * - Alertes stock dans le dashboard admin
 */
export const STOCK_THRESHOLDS = {
	/** Stock critique : < CRITICAL (alertes urgentes) */
	CRITICAL: 3,
	/** Stock bas : < LOW (alertes préventives) */
	LOW: 3,
	/** Stock normal max : <= NORMAL_MAX */
	NORMAL_MAX: 50,
} as const;

/**
 * Seuil de stock bas pour l'affichage boutique.
 * Un SKU est considéré en "low stock" quand son inventaire
 * est strictement inférieur à ce seuil.
 *
 * @deprecated Utiliser STOCK_THRESHOLDS.LOW à la place
 */
export const LOW_STOCK_THRESHOLD = STOCK_THRESHOLDS.LOW;

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
