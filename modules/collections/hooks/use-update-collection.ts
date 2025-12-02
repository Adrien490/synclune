"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { updateCollection } from "@/modules/collections/actions/update-collection";

interface Collection {
	id: string;
	name: string;
	slug: string;
	description: string | null;
}

interface UseUpdateCollectionFormOptions {
	collection: Collection;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de modification de collection
 * Utilise TanStack Form avec Next.js App Router
 * Pré-remplit le formulaire avec les données de la collection
 */
export const useUpdateCollectionForm = (
	options: UseUpdateCollectionFormOptions
) => {
	const { collection } = options;

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCollection,
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
			id: collection.id,
			name: collection.name,
			description: collection.description || "",
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
