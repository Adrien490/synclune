"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";
import { deleteProductSku } from "@/modules/products/actions/delete-product-sku";

interface UseDeleteProductSkuOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer une variante de produit
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 *
 * @example
 * ```tsx
 * const { isPending, deleteSku } = useDeleteProductSku({
 *   onSuccess: () => {
 *     deleteDialog.close();
 *     router.refresh();
 *   },
 * });
 *
 * const handleDelete = () => {
 *   deleteSku(skuId);
 * };
 * ```
 */
export const useDeleteProductSku = (options?: UseDeleteProductSkuOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteProductSku,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const deleteSku = (skuId: string) => {
		const formData = new FormData();
		formData.append("skuId", skuId);
		action(formData);
	};

	return {
		state,
		action,
		isPending,
		deleteSku,
	};
};
