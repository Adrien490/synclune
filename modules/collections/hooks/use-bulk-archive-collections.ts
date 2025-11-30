"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { bulkArchiveCollections } from "@/modules/collections/actions/bulk-archive-collections";
import type { CollectionStatus } from "@/app/generated/prisma/enums";

interface UseBulkArchiveCollectionsOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour archiver/desarchiver plusieurs collections
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la methode handle
 */
export const useBulkArchiveCollections = (
	options?: UseBulkArchiveCollectionsOptions
) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkArchiveCollections,
			createToastCallbacks({
				loadingMessage: "Changement de statut...",
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
	 * @param collectionIds Les IDs des collections
	 * @param targetStatus Le statut cible (ARCHIVED, PUBLIC, DRAFT)
	 */
	const handle = (collectionIds: string[], targetStatus: CollectionStatus) => {
		const formData = new FormData();
		formData.append("collectionIds", JSON.stringify(collectionIds));
		formData.append("targetStatus", targetStatus);
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
