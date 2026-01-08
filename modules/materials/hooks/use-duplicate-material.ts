"use client";

import { useActionState, useTransition } from "react";
import { duplicateMaterial } from "@/modules/materials/actions/duplicate-material";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseDuplicateMaterialOptions {
	onSuccess?: (data: { id: string; name: string }) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer un materiau
 */
export function useDuplicateMaterial(options?: UseDuplicateMaterialOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			duplicateMaterial,
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

	const duplicate = (materialId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("materialId", materialId);
			formAction(formData);
		});
	};

	return {
		duplicate,
		isPending,
	};
}
