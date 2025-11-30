"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkDeleteCollections } from "@/modules/collections/actions/bulk-delete-collections";

interface UseBulkDeleteCollectionsOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer plusieurs collections
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la méthode handle
 */
export const useBulkDeleteCollections = (
	options?: UseBulkDeleteCollectionsOptions
) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkDeleteCollections,
			createToastCallbacks({
				loadingMessage: "Suppression des collections...",
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
	 * @param collectionIds Les IDs des collections à supprimer
	 */
	const handle = (collectionIds: string[]) => {
		const formData = new FormData();
		formData.append("ids", JSON.stringify(collectionIds));
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
