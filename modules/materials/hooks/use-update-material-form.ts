"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { updateMaterial } from "@/modules/materials/actions/update-material";

interface Material {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	isActive: boolean;
}

interface UseUpdateMaterialFormOptions {
	material: Material;
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de modification de matériau
 * Utilise TanStack Form avec Next.js App Router
 * Pré-remplit le formulaire avec les données du matériau
 */
export const useUpdateMaterialForm = (options: UseUpdateMaterialFormOptions) => {
	const { material } = options;

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateMaterial,
			createToastCallbacks({
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

	const form = useAppForm({
		defaultValues: {
			id: material.id,
			name: material.name,
			slug: material.slug,
			description: material.description || "",
			isActive: material.isActive,
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
