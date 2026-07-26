"use client";

import { deleteMaterial } from "@/modules/materials/actions/delete-material";
import { useTaxonomyDelete } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useDeleteMaterial(options?: { onSuccess?: (message: string) => void }) {
	return useTaxonomyDelete(deleteMaterial, options);
}
