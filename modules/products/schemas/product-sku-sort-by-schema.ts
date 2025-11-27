import { z } from "zod";
import {
	GET_PRODUCT_SKUS_DEFAULT_SORT_BY,
	GET_PRODUCT_SKUS_SORT_FIELDS,
} from "../constants/product-skus-constants";

export const productSkuSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_PRODUCT_SKUS_SORT_FIELDS.includes(
			value as (typeof GET_PRODUCT_SKUS_SORT_FIELDS)[number]
		)
		? value
		: GET_PRODUCT_SKUS_DEFAULT_SORT_BY;
}, z.enum(GET_PRODUCT_SKUS_SORT_FIELDS));
