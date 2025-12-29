"use client";

import { useActionState, useTransition } from "react";
import { duplicateColor } from "@/modules/colors/actions/duplicate-color";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

interface UseDuplicateColorOptions {
	onSuccess?: (data: { id: string; name: string }) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer une couleur
 */
export function useDuplicateColor(options?: UseDuplicateColorOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				duplicateColor(formData.get("colorId") as string),
			createToastCallbacks({
				loadingMessage: "Duplication en cours...",
				onSuccess: (result) => {
					if (result.data) {
						options?.onSuccess?.(result.data as { id: string; name: string });
					}
				},
				onError: (result) => {
					if (result.message) {
						options?.onError?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const duplicate = (colorId: string, _colorName: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("colorId", colorId);
			formAction(formData);
		});
	};

	return {
		duplicate,
		isPending: isPending || isActionPending,
	};
}
