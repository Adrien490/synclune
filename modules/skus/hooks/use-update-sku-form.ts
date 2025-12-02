"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { updateProductSku } from "@/modules/skus/actions/update-sku";
import type { SkuWithImages } from "@/modules/skus/data/get-sku";
import { getUpdateProductSkuFormOpts } from "@/modules/skus/constants/update-sku-form-options";

interface UseUpdateProductSkuFormOptions {
	sku: SkuWithImages;
	onSuccess?: (message: string, data?: { productSlug?: string }) => void;
}

/**
 * Hook pour le formulaire d'édition de variante de produit (Product SKU)
 * Utilise TanStack Form avec Next.js App Router
 */
export const useUpdateProductSkuForm = ({
	sku,
	onSuccess,
}: UseUpdateProductSkuFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateProductSku,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: (result: unknown) => {
					// Call the custom success callback if provided
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						const data =
							"data" in result && result.data
								? (result.data as { productSlug?: string })
								: undefined;
						onSuccess?.(result.message, data);
					}
				},
			})
		),
		undefined
	);

	const formOpts = getUpdateProductSkuFormOpts(sku);

	const form = useAppForm({
		...formOpts,
		// Merge server state with form state for validation errors
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	// Subscribe to form errors for display
	const formErrors = useStore(form.store, (formState) => formState.errors);

	return {
		form,
		state,
		action,
		isPending,
		formErrors,
	};
};
