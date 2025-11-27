"use client";

import { useAppForm } from "@/shared/components/forms";
import { ActionStatus } from "@/shared/types/server-action";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { toast } from "sonner";
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
				loadingMessage: "Envoi de ton message en cours...",
				showSuccessToast: false, // Désactiver le toast automatique (géré manuellement)
				showErrorToast: false, // Désactiver les toasts d'erreur automatiques
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
				onError: (result: unknown) => {
					// Afficher le toast uniquement si ce n'est PAS une erreur de validation
					if (
						result &&
						typeof result === "object" &&
						"status" in result &&
						result.status !== ActionStatus.VALIDATION_ERROR &&
						"message" in result &&
						typeof result.message === "string"
					) {
						toast.error(result.message);
					}
					// Les erreurs de validation sont gérées par le formulaire lui-même
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
