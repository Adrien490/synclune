"use client";

import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { deleteMaterial } from "@/modules/materials/actions/delete-material";

interface UseDeleteMaterialOptions {
	onSuccess?: (message: string) => void;
}

export function useDeleteMaterial(options?: UseDeleteMaterialOptions) {
	return useActionWithToast(deleteMaterial, {
		onSuccess: (result) => {
			if (result.message) {
				options?.onSuccess?.(result.message);
			}
		},
	});
}
