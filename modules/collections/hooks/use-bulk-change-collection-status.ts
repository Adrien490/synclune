"use client";

import { useActionState, useTransition } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { bulkChangeCollectionStatus } from "@/modules/collections/actions/bulk-change-collection-status";

interface UseBulkChangeCollectionStatusOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkChangeCollectionStatus = (options?: UseBulkChangeCollectionStatusOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkChangeCollectionStatus,
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

	const handle = (collectionIds: string[], targetStatus: "DRAFT" | "PUBLIC") => {
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
