"use client";

import { deleteColor } from "@/modules/colors/actions/delete-color";
import { useTaxonomyDelete } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useDeleteColor(options?: { onSuccess?: (message: string) => void }) {
	return useTaxonomyDelete(deleteColor, options);
}
