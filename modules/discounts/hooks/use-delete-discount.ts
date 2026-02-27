"use client";

import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { deleteDiscount } from "@/modules/discounts/actions/delete-discount";

interface UseDeleteDiscountOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteDiscount = (options?: UseDeleteDiscountOptions) => {
	return useActionWithToast(deleteDiscount, {
		onSuccess: (result) => {
			if (result.message) {
				options?.onSuccess?.(result.message);
			}
		},
	});
};
