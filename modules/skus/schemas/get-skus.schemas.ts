import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_PRODUCT_SKUS_DEFAULT_PER_PAGE,
	GET_PRODUCT_SKUS_DEFAULT_SORT_BY,
	GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
} from "../constants/sku.constants";
import { productSkuFiltersSchema } from "./sku-filters-schema";
import { productSkuSortBySchema } from "./sku-sort-by-schema";

export const getProductSkusSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_PRODUCT_SKUS_DEFAULT_PER_PAGE, GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE),
	sortBy: productSkuSortBySchema.default(GET_PRODUCT_SKUS_DEFAULT_SORT_BY),
	search: z.string().max(200).optional(),
	filters: productSkuFiltersSchema.optional(),
});
