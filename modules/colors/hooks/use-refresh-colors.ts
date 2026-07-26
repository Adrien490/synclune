"use client";

import { refreshColors } from "@/modules/colors/actions/refresh-colors";
import { useTaxonomyRefresh } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";

export function useRefreshColors(options?: { onSuccess?: () => void }) {
	return useTaxonomyRefresh(refreshColors, options);
}
