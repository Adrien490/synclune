"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { createProductSku } from "@/modules/skus/actions/create-sku";
import { createProductSkuFormOpts } from "@/modules/skus/constants/create-sku-form-options";

interface UseCreateProductSkuFormOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de création de variante de produit (Product SKU)
 * Utilise TanStack Form avec Next.js App Router
 */
export const useCreateProductSkuForm = (
	options?: UseCreateProductSkuFormOptions
) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			createProductSku,
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
						options?.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const form = useAppForm({
		...createProductSkuFormOpts,
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
