"use client";

import { refreshMaterials } from "@/modules/materials/actions/refresh-materials";
import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";

export function useRefreshMaterials(options?: { onSuccess?: () => void }) {
	return useRefreshAction(refreshMaterials, options);
}
