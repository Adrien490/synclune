import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";
import {
	GET_INVENTORY_DEFAULT_PER_PAGE,
	GET_INVENTORY_DEFAULT_SORT_BY,
	GET_INVENTORY_MAX_RESULTS_PER_PAGE,
	GET_INVENTORY_SORT_FIELDS,
} from "../constants/inventory.constants";

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const stockLevelSchema = z.enum(["critical", "low", "normal", "high"]).optional();

export const inventoryFiltersSchema = z.object({
	productTypeId: optionalStringOrStringArraySchema,
	colorId: optionalStringOrStringArraySchema,
	material: optionalStringOrStringArraySchema,
	stockLevel: stockLevelSchema,
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
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_INVENTORY_DEFAULT_PER_PAGE, GET_INVENTORY_MAX_RESULTS_PER_PAGE),
	sortBy: inventorySortBySchema.default(GET_INVENTORY_DEFAULT_SORT_BY),
	search: z.string().max(200).optional(),
	filters: inventoryFiltersSchema.optional().default({
		productTypeId: undefined,
		colorId: undefined,
		material: undefined,
		stockLevel: undefined,
	}),
});
