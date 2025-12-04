import { z } from "zod";
import {
	GET_PRODUCT_SKUS_DEFAULT_PER_PAGE,
	GET_PRODUCT_SKUS_DEFAULT_SORT_BY,
	GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
} from "../constants/sku.constants";
import { productSkuFiltersSchema } from "./sku-filters-schema";
import { productSkuSortBySchema } from "./sku-sort-by-schema";

export const getProductSkusSchema = z.object({
	cursor: z.cuid2().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int({ error: "PerPage must be an integer" })
		.min(1, { error: "PerPage must be at least 1" })
		.max(
			GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
			`PerPage cannot exceed ${GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE}`
		)
		.default(GET_PRODUCT_SKUS_DEFAULT_PER_PAGE),
	sortBy: productSkuSortBySchema.default(GET_PRODUCT_SKUS_DEFAULT_SORT_BY),
	search: z.string().max(200).optional(),
	filters: productSkuFiltersSchema.optional(),
});
