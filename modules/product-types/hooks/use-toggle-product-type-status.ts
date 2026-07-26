"use client";

import { toggleProductTypeStatus } from "@/modules/product-types/actions/toggle-product-type-status";
import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { useTaxonomyToggleStatus } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useToggleProductTypeStatus(options?: {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}) {
	return useTaxonomyToggleStatus(toggleProductTypeStatus, TAXONOMY_CONFIG["product-type"], options);
}
