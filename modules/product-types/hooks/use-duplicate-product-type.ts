"use client";

import { useActionState, useTransition } from "react";
import { duplicateProductType } from "@/modules/product-types/actions/duplicate-product-type";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

export interface DuplicateProductTypeSuccessData {
	id: string;
	label: string;
	slug: string;
}

const isDuplicateProductTypeSuccessData = (
	value: unknown,
): value is DuplicateProductTypeSuccessData => {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as DuplicateProductTypeSuccessData).id === "string" &&
		typeof (value as DuplicateProductTypeSuccessData).label === "string" &&
		typeof (value as DuplicateProductTypeSuccessData).slug === "string"
	);
};

interface UseDuplicateProductTypeOptions {
	onSuccess?: (message: string, data: DuplicateProductTypeSuccessData) => void;
}

export const useDuplicateProductType = (options?: UseDuplicateProductTypeOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			duplicateProductType,
			createToastCallbacks({
				loadingMessage: "Duplication du type...",
				showSuccessToast: false,
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string" &&
						"data" in result &&
						isDuplicateProductTypeSuccessData(result.data)
					) {
						options?.onSuccess?.(result.message, result.data);
					}
				},
			}),
		),
		undefined,
	);

	const runDuplicate = (productTypeId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productTypeId", productTypeId);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		duplicateProductType: runDuplicate,
	};
};
