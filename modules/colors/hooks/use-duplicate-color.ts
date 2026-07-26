"use client";

import { duplicateColor } from "@/modules/colors/actions/duplicate-color";
import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import {
	useTaxonomyDuplicate,
	type TaxonomyDuplicateSuccessData,
} from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useDuplicateColor(options?: {
	onSuccess?: (message: string, data: TaxonomyDuplicateSuccessData) => void;
	onError?: (message: string) => void;
}) {
	return useTaxonomyDuplicate(duplicateColor, TAXONOMY_CONFIG.color, options);
}
