"use client";

import { refreshMaterials } from "@/modules/materials/actions/refresh-materials";
import { useTaxonomyRefresh } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useRefreshMaterials(options?: { onSuccess?: () => void }) {
	return useTaxonomyRefresh(refreshMaterials, options);
}
