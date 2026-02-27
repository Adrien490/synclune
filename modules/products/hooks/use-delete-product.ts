"use client";

import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { deleteProduct } from "@/modules/products/actions/delete-product";

interface UseDeleteProductOptions {
	onSuccess?: () => void;
}

export function useDeleteProduct(options?: UseDeleteProductOptions) {
	return useActionWithToast(deleteProduct, {
		onSuccess: () => options?.onSuccess?.(),
	});
}
