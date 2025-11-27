"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";
import { unsubscribeFromNewsletter } from "@/modules/newsletter/actions/unsubscribe-from-newsletter";

interface UseUnsubscribeFromNewsletterOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour se désinscrire de la newsletter
 * Compatible avec useActionState de React 19
 * Utilise withCallbacks pour une gestion élégante des toasts
 */
export function useUnsubscribeFromNewsletter(
	options?: UseUnsubscribeFromNewsletterOptions
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			unsubscribeFromNewsletter,
			createToastCallbacks({
				showSuccessToast: true, // Afficher un toast de succès
				showErrorToast: true, // Afficher les erreurs
				onSuccess: (result: unknown) => {
					// Appeler le callback personnalisé de succès si fourni
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

	return {
		state,
		action,
		isPending,
	};
}
