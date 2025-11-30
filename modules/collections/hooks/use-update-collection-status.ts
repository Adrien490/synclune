"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { updateCollectionStatus } from "@/modules/collections/actions/update-collection-status";
import type { CollectionStatus } from "@/app/generated/prisma/enums";

interface UseUpdateCollectionStatusOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour changer le statut d'une collection
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 */
export const useUpdateCollectionStatus = (
	options?: UseUpdateCollectionStatusOptions
) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCollectionStatus,
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

	const updateStatus = (collectionId: string, targetStatus: CollectionStatus) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("id", collectionId);
			formData.append("status", targetStatus);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		updateStatus,
	};
};
