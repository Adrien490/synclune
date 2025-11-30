"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { deleteProduct } from "@/modules/products/actions/delete-product";

interface UseDeleteProductOptions {
	onSuccess?: () => void;
}

export function useDeleteProduct(options?: UseDeleteProductOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteProduct,
			createToastCallbacks({
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
