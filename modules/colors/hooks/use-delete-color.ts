"use client";

import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { deleteColor } from "@/modules/colors/actions/delete-color";

interface UseDeleteColorOptions {
	onSuccess?: (message: string) => void;
}

export function useDeleteColor(options?: UseDeleteColorOptions) {
	return useActionWithToast(deleteColor, {
		onSuccess: (result) => {
			if (result.message) {
				options?.onSuccess?.(result.message);
			}
		},
	});
}
