"use client";

import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { deleteProductType } from "@/modules/product-types/actions/delete-product-type";

interface UseDeleteProductTypeOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteProductType = (options?: UseDeleteProductTypeOptions) => {
	return useActionWithToast(deleteProductType, {
		onSuccess: (result) => {
			if (result.message) {
				options?.onSuccess?.(result.message);
			}
		},
	});
};
