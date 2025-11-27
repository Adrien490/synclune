"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";
import { deleteProduct } from "@/modules/products/actions/delete-product";

export function useDeleteProduct() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteProduct,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
