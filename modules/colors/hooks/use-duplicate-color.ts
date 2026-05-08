"use client";

import { useActionState, useTransition } from "react";
import { duplicateColor } from "@/modules/colors/actions/duplicate-color";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export interface DuplicateColorSuccessData {
	id: string;
	name: string;
	slug: string;
}

const isDuplicateColorSuccessData = (value: unknown): value is DuplicateColorSuccessData => {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as DuplicateColorSuccessData).id === "string" &&
		typeof (value as DuplicateColorSuccessData).name === "string" &&
		typeof (value as DuplicateColorSuccessData).slug === "string"
	);
};

interface UseDuplicateColorOptions {
	onSuccess?: (message: string, data: DuplicateColorSuccessData) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer une couleur
 */
export function useDuplicateColor(options?: UseDuplicateColorOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			duplicateColor,
			createToastCallbacks({
				loadingMessage: "Duplication en cours...",
				showSuccessToast: false,
				onSuccess: (result) => {
					if (typeof result.message === "string" && isDuplicateColorSuccessData(result.data)) {
						options?.onSuccess?.(result.message, result.data);
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

	const duplicate = (colorId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("colorId", colorId);
			formAction(formData);
		});
	};

	return {
		duplicate,
		isPending,
	};
}
