"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { confirmSubscription } from "@/modules/newsletter/actions/confirm-subscription";

interface UseConfirmSubscriptionOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour confirmer l'inscription à la newsletter (double opt-in)
 * Compatible avec useActionState de React 19
 * Utilise withCallbacks pour une gestion élégante des toasts
 */
export function useConfirmSubscription(
	options?: UseConfirmSubscriptionOptions
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			confirmSubscription,
			createToastCallbacks({
				showSuccessToast: false, // Pas de toast - on utilise le dialog
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
