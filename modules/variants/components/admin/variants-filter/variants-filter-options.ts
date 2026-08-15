/**
 * Options et types partagés pour le VariantsFilterSheet.
 */

export type VariantActiveFilter = "all" | "active" | "inactive";

export interface VariantsFilterFormData {
	stockStatuses: string[];
	colorIds: string[];
	materialIds: string[];
	active: VariantActiveFilter;
}

export const VARIANT_STOCK_STATUS_OPTIONS = [
	{ value: "in_stock", label: "En stock" },
	{ value: "low_stock", label: "Stock faible" },
	{ value: "out_of_stock", label: "Rupture" },
] as const;

export const VARIANT_ACTIVE_STATUS_OPTIONS = [
	{ value: "all", label: "Toutes" },
	{ value: "active", label: "Actives uniquement" },
	{ value: "inactive", label: "Inactives uniquement" },
] as const;

export const VARIANT_FILTER_KEYS = [
	"filter_stockStatus",
	"filter_colorId",
	"filter_materialId",
	"filter_isActive",
] as const;
