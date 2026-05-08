"use client";

import { useActionState, useTransition } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { duplicateCollection } from "@/modules/collections/actions/duplicate-collection";

export interface DuplicateCollectionSuccessData {
	collectionId: string;
	name: string;
	slug: string;
}

const isDuplicateCollectionSuccessData = (
	value: unknown,
): value is DuplicateCollectionSuccessData => {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as DuplicateCollectionSuccessData).collectionId === "string" &&
		typeof (value as DuplicateCollectionSuccessData).name === "string" &&
		typeof (value as DuplicateCollectionSuccessData).slug === "string"
	);
};

interface UseDuplicateCollectionOptions {
	onSuccess?: (message: string, data: DuplicateCollectionSuccessData) => void;
}

export const useDuplicateCollection = (options?: UseDuplicateCollectionOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			duplicateCollection,
			createToastCallbacks({
				loadingMessage: "Duplication de la collection...",
				showSuccessToast: false,
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string" &&
						"data" in result &&
						isDuplicateCollectionSuccessData(result.data)
					) {
						options?.onSuccess?.(result.message, result.data);
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
