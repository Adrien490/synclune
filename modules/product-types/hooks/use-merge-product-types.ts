"use client";

import { mergeProductTypes } from "@/modules/product-types/actions/merge-product-types";
import { useActionStateWithToast } from "@/shared/hooks/use-action-state-with-toast";

interface UseMergeProductTypesOptions {
	onSuccess?: (message: string) => void;
}

export const useMergeProductTypes = (options?: UseMergeProductTypesOptions) => {
	const { state, action, isPending } = useActionStateWithToast(mergeProductTypes, {
		loadingMessage: "Fusion des types...",
		onSuccess: (message) => {
			if (message) options?.onSuccess?.(message);
		},
	});

	const runMerge = (sourceId: string, targetId: string) => {
		const formData = new FormData();
		formData.append("sourceId", sourceId);
		formData.append("targetId", targetId);
		action(formData);
	};

	return {
		state,
		action,
		isPending,
		mergeProductTypes: runMerge,
	};
};
