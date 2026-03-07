"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { deleteMaterial } from "@/modules/materials/actions/delete-material";

interface UseDeleteMaterialOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer un materiau
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la methode handle
 */
export const useDeleteMaterial = (options?: UseDeleteMaterialOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			deleteMaterial,
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
			}),
		),
		undefined,
	);

	const [isTransitionPending, startTransition] = useTransition();

	/**
	 * Methode utilitaire pour appeler l'action programmatiquement
	 * @param materialId L'ID du materiau a supprimer
	 */
	const handle = (materialId: string) => {
		const formData = new FormData();
		formData.append("id", materialId);
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
