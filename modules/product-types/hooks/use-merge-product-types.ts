"use client";

import { useActionState, useTransition } from "react";
import { mergeProductTypes } from "@/modules/product-types/actions/merge-product-types";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

interface UseMergeProductTypesOptions {
	onSuccess?: (message: string) => void;
}

export const useMergeProductTypes = (options?: UseMergeProductTypesOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			mergeProductTypes,
			createToastCallbacks({
				loadingMessage: "Fusion des types...",
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

	const runMerge = (sourceId: string, targetId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("sourceId", sourceId);
			formData.append("targetId", targetId);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		mergeProductTypes: runMerge,
	};
};
