"use client";

import { refreshProductTypes } from "@/modules/product-types/actions/refresh-product-types";
import { useTaxonomyRefresh } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useRefreshProductTypes(options?: { onSuccess?: () => void }) {
	return useTaxonomyRefresh(refreshProductTypes, options);
}
