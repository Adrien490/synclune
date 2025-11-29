"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkToggleMaterialStatus } from "@/modules/materials/actions/bulk-toggle-material-status";

interface UseBulkToggleMaterialStatusOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour activer/desactiver plusieurs materiaux
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la methode handle
 */
export const useBulkToggleMaterialStatus = (options?: UseBulkToggleMaterialStatusOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkToggleMaterialStatus,
			createToastCallbacks({
				loadingMessage: "Modification du statut...",
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
	 * Methode utilitaire pour appeler l'action programmatiquement
	 * @param materialIds Les IDs des materiaux a modifier
	 * @param isActive Le nouveau statut
	 */
	const handle = (materialIds: string[], isActive: boolean) => {
		const formData = new FormData();
		formData.append("ids", JSON.stringify(materialIds));
		formData.append("isActive", String(isActive));
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
