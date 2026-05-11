/**
 * Options et types partagés pour le SkusFilterSheet.
 */

export type SkuActiveFilter = "all" | "active" | "inactive";

export interface SkusFilterFormData {
	stockStatuses: string[];
	colorIds: string[];
	materialIds: string[];
	isActive: SkuActiveFilter;
}

export const SKU_STOCK_STATUS_OPTIONS = [
	{ value: "in_stock", label: "En stock" },
	{ value: "low_stock", label: "Stock faible" },
	{ value: "out_of_stock", label: "Rupture" },
] as const;

export const SKU_ACTIVE_STATUS_OPTIONS = [
	{ value: "all", label: "Toutes" },
	{ value: "active", label: "Actives uniquement" },
	{ value: "inactive", label: "Inactives uniquement" },
] as const;

export const SKU_FILTER_KEYS = [
	"filter_stockStatus",
	"filter_colorId",
	"filter_materialId",
	"filter_isActive",
] as const;
