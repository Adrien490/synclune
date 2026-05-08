"use client";

import { useActionState, useTransition } from "react";
import { duplicateMaterial } from "@/modules/materials/actions/duplicate-material";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export interface DuplicateMaterialSuccessData {
	id: string;
	name: string;
	slug: string;
}

const isDuplicateMaterialSuccessData = (value: unknown): value is DuplicateMaterialSuccessData => {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as DuplicateMaterialSuccessData).id === "string" &&
		typeof (value as DuplicateMaterialSuccessData).name === "string" &&
		typeof (value as DuplicateMaterialSuccessData).slug === "string"
	);
};

interface UseDuplicateMaterialOptions {
	onSuccess?: (message: string, data: DuplicateMaterialSuccessData) => void;
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
				showSuccessToast: false,
				onSuccess: (result) => {
					if (typeof result.message === "string" && isDuplicateMaterialSuccessData(result.data)) {
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
