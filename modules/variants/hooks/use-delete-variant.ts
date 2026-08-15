"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { deleteVariant as deleteVariantAction } from "@/modules/variants/actions/delete-variant";

interface UseDeleteProductVariantOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer une variante de produit
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 *
 * @example
 * ```tsx
 * const { isPending, deleteVariant } = useDeleteProductVariant({
 *   onSuccess: () => {
 *     deleteDialog.close();
 *     router.refresh();
 *   },
 * });
 *
 * const handleDelete = () => {
 *   deleteVariant(variantId);
 * };
 * ```
 */
export const useDeleteProductVariant = (options?: UseDeleteProductVariantOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteVariantAction,
			createToastCallbacks({
				loadingMessage: "Suppression de la variante…",
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
			}),
		),
		undefined,
	);

	const deleteVariant = (variantId: string) => {
		const formData = new FormData();
		formData.append("variantId", variantId);
		action(formData);
	};

	return {
		state,
		action,
		isPending,
		deleteVariant,
	};
};
