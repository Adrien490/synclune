"use client";

import { duplicateMaterial } from "@/modules/materials/actions/duplicate-material";
import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import {
	useTaxonomyDuplicate,
	type TaxonomyDuplicateSuccessData,
} from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useDuplicateMaterial(options?: {
	onSuccess?: (message: string, data: TaxonomyDuplicateSuccessData) => void;
	onError?: (message: string) => void;
}) {
	return useTaxonomyDuplicate(duplicateMaterial, TAXONOMY_CONFIG.material, options);
}
