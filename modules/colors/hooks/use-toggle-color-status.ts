"use client";

import { toggleColorStatus } from "@/modules/colors/actions/toggle-color-status";
import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { useTaxonomyToggleStatus } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useToggleColorStatus(options?: {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}) {
	return useTaxonomyToggleStatus(toggleColorStatus, TAXONOMY_CONFIG.color, options);
}
