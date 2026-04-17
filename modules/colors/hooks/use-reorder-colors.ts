"use client";

import { useActionState, useTransition } from "react";
import { reorderColors } from "@/modules/colors/actions/reorder-colors";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseReorderColorsOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour réordonner les couleurs (drag-and-drop).
 */
export function useReorderColors(options?: UseReorderColorsOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			reorderColors,
			createToastCallbacks({
				loadingMessage: "Réordonnancement en cours...",
				onSuccess: () => {
					options?.onSuccess?.();
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

	const reorder = (items: { id: string; position: number }[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("items", JSON.stringify(items));
			formAction(formData);
		});
	};

	return {
		reorder,
		isPending,
	};
}
