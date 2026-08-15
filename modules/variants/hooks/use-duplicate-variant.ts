"use client";

import { useActionState, useTransition } from "react";
import { duplicateVariant } from "@/modules/variants/actions/duplicate-variant";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export interface DuplicateVariantSuccessData {
	id: string;
	variant: string;
	productId: string;
	productSlug: string;
}

const isDuplicateVariantSuccessData = (value: unknown): value is DuplicateVariantSuccessData => {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as DuplicateVariantSuccessData).id === "string" &&
		typeof (value as DuplicateVariantSuccessData).variant === "string" &&
		typeof (value as DuplicateVariantSuccessData).productId === "string" &&
		typeof (value as DuplicateVariantSuccessData).productSlug === "string"
	);
};

interface UseDuplicateVariantOptions {
	onSuccess?: (message: string, data: DuplicateVariantSuccessData) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer un VARIANT
 */
export function useDuplicateVariant(options?: UseDuplicateVariantOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			duplicateVariant,
			createToastCallbacks({
				loadingMessage: "Duplication en cours…",
				showSuccessToast: false,
				onSuccess: (result) => {
					if (typeof result.message === "string" && isDuplicateVariantSuccessData(result.data)) {
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

	const duplicate = (variantId: string, _variantName: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("variantId", variantId);
			formAction(formData);
		});
	};

	return {
		duplicate,
		isPending,
	};
}
