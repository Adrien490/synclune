"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { createProductType } from "@/modules/product-types/actions/create-product-type";

interface UseCreateProductTypeFormOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de création de type de produit
 * Utilise TanStack Form avec Next.js App Router
 */
export const useCreateProductTypeForm = (
	options?: UseCreateProductTypeFormOptions
) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			createProductType,
			createToastCallbacks({
				loadingMessage: "Création du type de produit en cours...",
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
		defaultValues: {
			label: "",
			description: "",
		},
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
