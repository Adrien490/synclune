"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";
import { subscribeToNewsletter } from "@/modules/newsletter/actions/subscribe-to-newsletter";

interface UseSubscribeToNewsletterOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour s'inscrire à la newsletter
 * Compatible avec useActionState de React 19
 * Utilise withCallbacks pour une gestion élégante des toasts
 */
export function useSubscribeToNewsletter(
	options?: UseSubscribeToNewsletterOptions
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			subscribeToNewsletter,
			createToastCallbacks({
				showSuccessToast: false, // Pas de toast de succès car on utilise le dialog
				showErrorToast: false, // Toasts d'erreur désactivés
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
