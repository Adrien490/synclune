"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshMaterials } from "@/modules/materials/actions/refresh-materials";

interface UseRefreshMaterialsOptions {
	onSuccess?: () => void;
}

export function useRefreshMaterials(options?: UseRefreshMaterialsOptions) {
	return useRefreshAction(refreshMaterials, {
		onSuccess: options?.onSuccess,
	});
}
