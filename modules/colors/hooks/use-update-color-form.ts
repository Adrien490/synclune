"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { updateColor } from "@/modules/colors/actions/update-color";

interface Color {
	id: string;
	name: string;
	slug: string;
	hex: string;
}

interface UseUpdateColorFormOptions {
	color: Color;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de modification de couleur
 * Utilise TanStack Form avec Next.js App Router
 * Pré-remplit le formulaire avec les données de la couleur
 */
export const useUpdateColorForm = (options: UseUpdateColorFormOptions) => {
	const { color } = options;

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateColor,
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
			id: color.id,
			name: color.name,
			hex: color.hex,
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
