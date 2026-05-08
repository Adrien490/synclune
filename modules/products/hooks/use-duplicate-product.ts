"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { duplicateProduct } from "@/modules/products/actions/duplicate-product";

export interface DuplicateProductSuccessData {
	productId: string;
	title: string;
	slug: string;
}

interface UseDuplicateProductOptions {
	onSuccess?: (message: string, data: DuplicateProductSuccessData) => void;
}

const isDuplicateProductSuccessData = (value: unknown): value is DuplicateProductSuccessData => {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as DuplicateProductSuccessData).productId === "string" &&
		typeof (value as DuplicateProductSuccessData).title === "string" &&
		typeof (value as DuplicateProductSuccessData).slug === "string"
	);
};

export const useDuplicateProduct = (options?: UseDuplicateProductOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			duplicateProduct,
			createToastCallbacks({
				loadingMessage: "Duplication du produit…",
				showSuccessToast: false,
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string" &&
						"data" in result &&
						isDuplicateProductSuccessData(result.data)
					) {
						options?.onSuccess?.(result.message, result.data);
					}
				},
			}),
		),
		undefined,
	);

	const doDuplicate = (productId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productId", productId);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		doDuplicate,
	};
};
