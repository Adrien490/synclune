"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { createProduct } from "@/modules/products/actions/create-product";
import { createProductFormOpts } from "@/modules/products/constants/create-product-form-options";

interface UseCreateProductFormOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de création de produit
 * Utilise TanStack Form avec Next.js App Router
 */
export const useCreateProductForm = (options?: UseCreateProductFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			createProduct,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
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
		...createProductFormOpts,
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
