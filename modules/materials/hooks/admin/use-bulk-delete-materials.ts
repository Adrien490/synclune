"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkDeleteMaterials } from "@/modules/materials/actions/bulk-delete-materials";

interface UseBulkDeleteMaterialsOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer plusieurs materiaux
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la méthode handle
 */
export const useBulkDeleteMaterials = (options?: UseBulkDeleteMaterialsOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkDeleteMaterials,
			createToastCallbacks({
				loadingMessage: "Suppression des matériaux...",
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
	 * @param materialIds Les IDs des materiaux à supprimer
	 */
	const handle = (materialIds: string[]) => {
		const formData = new FormData();
		formData.append("ids", JSON.stringify(materialIds));
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
