"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkDeleteColors } from "@/modules/colors/actions/bulk-delete-colors";

interface UseBulkDeleteColorsOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer plusieurs couleurs
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la méthode handle
 */
export const useBulkDeleteColors = (options?: UseBulkDeleteColorsOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkDeleteColors,
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

	const [isTransitionPending, startTransition] = useTransition();

	/**
	 * Méthode utilitaire pour appeler l'action programmatiquement
	 * @param colorIds Les IDs des couleurs à supprimer
	 */
	const handle = (colorIds: string[]) => {
		const formData = new FormData();
		formData.append("ids", JSON.stringify(colorIds));
		startTransition(() => {
			formAction(formData);
		});
	};

	return {
		state,
		action: formAction,
		isPending: isFormPending || isTransitionPending,
		handle,
	};
};
