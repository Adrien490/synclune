"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { updateProductType } from "@/modules/product-types/actions/update-product-type";

interface ProductType {
	id: string;
	label: string;
	description?: string | null;
	slug: string; // Utilisé uniquement pour passer aux actions (edit dialog)
}

interface UseUpdateProductTypeFormOptions {
	productType: ProductType;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de modification de type de produit
 * Utilise TanStack Form avec Next.js App Router
 * Pré-remplit le formulaire avec les données du type
 */
export const useUpdateProductTypeForm = (
	options: UseUpdateProductTypeFormOptions
) => {
	const { productType } = options;

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateProductType,
			createToastCallbacks({
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
			id: productType.id,
			label: productType.label,
			description: productType.description || "",
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
