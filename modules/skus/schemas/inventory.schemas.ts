import { z } from "zod";
import {
	GET_INVENTORY_DEFAULT_PER_PAGE,
	GET_INVENTORY_DEFAULT_SORT_BY,
	GET_INVENTORY_MAX_RESULTS_PER_PAGE,
	GET_INVENTORY_SORT_FIELDS,
} from "../constants/inventory.constants";

// ============================================================================
// HELPERS
// ============================================================================

const stringOrStringArray = z
	.union([
		z.string().min(1).max(100),
		z.array(z.string().min(1).max(100)).max(50),
	])
	.optional();

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const stockLevelSchema = z.enum(["critical", "low", "normal", "high"]).optional();

export const inventoryFiltersSchema = z.object({
	productTypeId: stringOrStringArray,
	colorId: stringOrStringArray,
	material: stringOrStringArray,
	stockLevel: stockLevelSchema,
	hasActiveReservations: z
		.union([z.boolean(), z.enum(["true", "false"])])
		.optional()
		.transform((val) => {
			if (typeof val === "boolean") return val;
			if (val === "true") return true;
			if (val === "false") return false;
			return undefined;
		}),
});

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const inventorySortBySchema = z.preprocess((value) => {
	return typeof value === "string" && GET_INVENTORY_SORT_FIELDS.includes(value as (typeof GET_INVENTORY_SORT_FIELDS)[number])
		? value
		: GET_INVENTORY_DEFAULT_SORT_BY;
}, z.enum(GET_INVENTORY_SORT_FIELDS as unknown as [string, ...string[]]));

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getSkuStocksSchema = z.object({
	cursor: z.string().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce.number().int().min(1).max(GET_INVENTORY_MAX_RESULTS_PER_PAGE).default(GET_INVENTORY_DEFAULT_PER_PAGE),
	sortBy: inventorySortBySchema.default(GET_INVENTORY_DEFAULT_SORT_BY),
	search: z.string().max(200).optional(),
	filters: inventoryFiltersSchema.optional().default({
		productTypeId: undefined,
		colorId: undefined,
		material: undefined,
		stockLevel: undefined,
		hasActiveReservations: undefined,
	}),
});
