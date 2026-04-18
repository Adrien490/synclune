"use client";

import { useActionState, useTransition } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { duplicateCollection } from "@/modules/collections/actions/duplicate-collection";

interface UseDuplicateCollectionOptions {
	onSuccess?: (message: string) => void;
}

export const useDuplicateCollection = (options?: UseDuplicateCollectionOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			duplicateCollection,
			createToastCallbacks({
				loadingMessage: "Duplication de la collection...",
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

	const handle = (collectionId: string) => {
		const formData = new FormData();
		formData.append("collectionId", collectionId);
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
