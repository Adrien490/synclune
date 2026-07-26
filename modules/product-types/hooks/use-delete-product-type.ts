"use client";

import { deleteProductType } from "@/modules/product-types/actions/delete-product-type";
import { useTaxonomyDelete } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useDeleteProductType(options?: { onSuccess?: (message: string) => void }) {
	return useTaxonomyDelete(deleteProductType, options);
}
