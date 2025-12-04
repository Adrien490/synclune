import {
	GET_PRODUCT_SKUS_SORT_FIELDS,
	SORT_LABELS as DOMAIN_SORT_LABELS,
} from "@/modules/skus/constants/sku.constants";

/**
 * Available sort fields for product variants
 */
export const VARIANT_SORT_FIELDS = GET_PRODUCT_SKUS_SORT_FIELDS;

/**
 * Sort labels for product variants UI
 */
export const VARIANT_SORT_LABELS: Record<string, string> = DOMAIN_SORT_LABELS;
