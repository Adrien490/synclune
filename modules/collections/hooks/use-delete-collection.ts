"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { deleteCollection } from "@/modules/collections/actions/delete-collection";

interface UseDeleteCollectionOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteCollection = (options?: UseDeleteCollectionOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteCollection,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
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

	return {
		state,
		action,
		isPending,
	};
};
