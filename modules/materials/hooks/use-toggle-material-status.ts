"use client";

import { toggleMaterialStatus } from "@/modules/materials/actions/toggle-material-status";
import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { useTaxonomyToggleStatus } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useToggleMaterialStatus(options?: {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}) {
	return useTaxonomyToggleStatus(toggleMaterialStatus, TAXONOMY_CONFIG.material, options);
}
