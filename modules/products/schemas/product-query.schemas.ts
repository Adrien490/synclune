import { ProductStatus } from "@/app/generated/prisma/client";
import { z } from "zod";

import { cursorSchema, directionSchema } from "@/shared/constants/pagination";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";
import { PRICE_LIMITS, DATE_LIMITS, TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { createPerPageSchema } from "@/shared/utils/pagination";

import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCTS_SORT_FIELDS,
} from "../constants/product.constants";

// ============================================================================
// SINGLE PRODUCT
// ============================================================================

export const getProductSchema = z.object({
	slug: z
		.string()
		.trim()
		.min(1)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Format slug invalide"),
	includeDraft: z.boolean().default(false),
});

// ============================================================================
// FILTERS
// ============================================================================

export const productFiltersSchema = z
	.object({
		type: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
		color: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
		material: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
		status: z.union([z.enum(ProductStatus), z.array(z.enum(ProductStatus))]).optional(),
		stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock"]).optional(),
		onSale: z.boolean().optional(),
		ratingMin: z.number().int().min(1).max(5).optional(),
		collectionId: optionalStringOrStringArraySchema,
		collectionSlug: optionalStringOrStringArraySchema,
		/** Filter by specific product slugs (for curated selections) */
		slugs: z.array(z.string().min(1)).max(20).optional(),
		priceMin: z.number().int().nonnegative().max(PRICE_LIMITS.FILTER_MAX_CENTS).optional(),
		priceMax: z.number().int().nonnegative().max(PRICE_LIMITS.FILTER_MAX_CENTS).optional(),
		createdAfter: z.coerce.date().min(DATE_LIMITS.FILTERS_MIN).max(new Date()).optional(),
		createdBefore: z.coerce.date().min(DATE_LIMITS.FILTERS_MIN).optional(),
		updatedAfter: z.coerce.date().min(DATE_LIMITS.FILTERS_MIN).max(new Date()).optional(),
		updatedBefore: z.coerce.date().min(DATE_LIMITS.FILTERS_MIN).optional(),
	})
	.refine((data) => {
		if (data.priceMin !== undefined && data.priceMax !== undefined) {
			return data.priceMin <= data.priceMax;
		}
		return true;
	}, "priceMin must be less than or equal to priceMax")
	.refine((data) => {
		if (data.createdAfter && data.createdBefore) {
			return data.createdAfter <= data.createdBefore;
		}
		return true;
	})
	.refine((data) => {
		if (data.updatedAfter && data.updatedBefore) {
			return data.updatedAfter <= data.updatedBefore;
		}
		return true;
	});

// ============================================================================
// SORT
// ============================================================================

const productSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_PRODUCTS_SORT_FIELDS.includes(value as (typeof GET_PRODUCTS_SORT_FIELDS)[number])
		? value
		: GET_PRODUCTS_DEFAULT_SORT_BY;
}, z.enum(GET_PRODUCTS_SORT_FIELDS));

// ============================================================================
// LISTING (paginated)
// ============================================================================

export const getProductsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_PRODUCTS_DEFAULT_PER_PAGE, GET_PRODUCTS_MAX_RESULTS_PER_PAGE),
	sortBy: productSortBySchema.default(GET_PRODUCTS_DEFAULT_SORT_BY),
	search: z.string().max(TEXT_LIMITS.PRODUCT_SEARCH.max).optional(),
	filters: productFiltersSchema.default({}),
	status: z.enum([ProductStatus.PUBLIC, ProductStatus.DRAFT, ProductStatus.ARCHIVED]).optional(),
	includeDeleted: z.boolean().optional(),
});
