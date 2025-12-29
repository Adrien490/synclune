import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";
import {
	GET_ORDER_ITEMS_DEFAULT_PER_PAGE,
	GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE,
	GET_ORDER_ITEMS_DEFAULT_SORT_BY,
	GET_ORDER_ITEMS_DEFAULT_SORT_ORDER,
	GET_ORDER_ITEMS_SORT_FIELDS,
} from "../constants/order-items.constants";

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const orderItemFiltersSchema = z
	.object({
		orderId: optionalStringOrStringArraySchema,
		productId: optionalStringOrStringArraySchema,
		skuId: optionalStringOrStringArraySchema,
		priceMin: z.number().int().nonnegative().max(10000000).optional(),
		priceMax: z.number().int().nonnegative().max(10000000).optional(),
		quantityMin: z.number().int().nonnegative().max(1000).optional(),
		quantityMax: z.number().int().nonnegative().max(1000).optional(),
		hasTax: z.boolean().optional(),
		isTaxIncluded: z.boolean().optional(),
		createdAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		createdBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		updatedAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		updatedBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		hasCustomizations: z.boolean().optional(),
	})
	.refine((data) => {
		if (data.priceMin && data.priceMax) {
			return data.priceMin <= data.priceMax;
		}
		return true;
	}, "priceMin must be less than or equal to priceMax")
	.refine((data) => {
		if (data.quantityMin && data.quantityMax) {
			return data.quantityMin <= data.quantityMax;
		}
		return true;
	}, "quantityMin must be less than or equal to quantityMax")
	.refine((data) => {
		if (data.createdAfter && data.createdBefore) {
			return data.createdAfter <= data.createdBefore;
		}
		return true;
	}, "createdAfter must be before or equal to createdBefore")
	.refine((data) => {
		if (data.updatedAfter && data.updatedBefore) {
			return data.updatedAfter <= data.updatedBefore;
		}
		return true;
	}, "updatedAfter must be before or equal to updatedBefore");

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const orderItemSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_ORDER_ITEMS_SORT_FIELDS.includes(
			value as (typeof GET_ORDER_ITEMS_SORT_FIELDS)[number]
		)
		? value
		: GET_ORDER_ITEMS_DEFAULT_SORT_BY;
}, z.enum(GET_ORDER_ITEMS_SORT_FIELDS));

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getOrderItemsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_ORDER_ITEMS_DEFAULT_PER_PAGE, GET_ORDER_ITEMS_MAX_RESULTS_PER_PAGE),
	sortBy: orderItemSortBySchema.default(GET_ORDER_ITEMS_DEFAULT_SORT_BY),
	sortOrder: z.enum(["asc", "desc"]).default(GET_ORDER_ITEMS_DEFAULT_SORT_ORDER),
	filters: orderItemFiltersSchema.default({}),
});
