import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { z } from "zod";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_PRODUCT_VARIANTS_DEFAULT_PER_PAGE,
	GET_PRODUCT_VARIANTS_DEFAULT_SORT_BY,
	GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE,
} from "../constants/variant.constants";
import { productVariantFiltersSchema } from "./variant-filters-schema";
import { productVariantSortBySchema } from "./variant-sort-by-schema";

export const getProductVariantsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(
		GET_PRODUCT_VARIANTS_DEFAULT_PER_PAGE,
		GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE,
	),
	sortBy: productVariantSortBySchema.default(GET_PRODUCT_VARIANTS_DEFAULT_SORT_BY),
	search: z.string().max(TEXT_LIMITS.SEARCH.max).optional(),
	filters: productVariantFiltersSchema.optional(),
});

export type GetProductVariantsInput = z.infer<typeof getProductVariantsSchema>;
