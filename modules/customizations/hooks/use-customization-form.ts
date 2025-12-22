"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { customizationFormOpts } from "../constants/customization-form-options";
import { sendCustomizationRequest } from "../actions/send-customization-request";

interface UseCustomizationFormOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de personnalisation
 * Utilise TanStack Form avec Next.js App Router
 */
export const useCustomizationForm = (options?: UseCustomizationFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			sendCustomizationRequest,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
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
		...customizationFormOpts,
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
