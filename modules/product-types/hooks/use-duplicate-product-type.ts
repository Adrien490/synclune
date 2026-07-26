"use client";

import { duplicateProductType } from "@/modules/product-types/actions/duplicate-product-type";
import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import {
	useTaxonomyDuplicate,
	type TaxonomyDuplicateSuccessData,
} from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useDuplicateProductType(options?: {
	onSuccess?: (message: string, data: TaxonomyDuplicateSuccessData) => void;
	onError?: (message: string) => void;
}) {
	return useTaxonomyDuplicate(
		duplicateProductType,
		TAXONOMY_CONFIG["product-type"],
		options,
	);
}
