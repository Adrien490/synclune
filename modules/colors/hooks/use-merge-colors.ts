"use client";

import { useActionState, useTransition } from "react";
import { mergeColors } from "@/modules/colors/actions/merge-colors";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseMergeColorsOptions {
	onSuccess?: (data: { reassignedCount: number; targetId: string }) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour fusionner deux couleurs (source → cible).
 */
export function useMergeColors(options?: UseMergeColorsOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			mergeColors,
			createToastCallbacks({
				loadingMessage: "Fusion en cours...",
				onSuccess: (result) => {
					if (result.data) {
						options?.onSuccess?.(result.data as { reassignedCount: number; targetId: string });
					}
				},
				onError: (result) => {
					if (result.message) {
						options?.onError?.(result.message);
					}
				},
			}),
		),
		undefined,
	);

	const merge = (sourceId: string, targetId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("sourceId", sourceId);
			formData.append("targetId", targetId);
			formAction(formData);
		});
	};

	return {
		merge,
		isPending,
	};
}
