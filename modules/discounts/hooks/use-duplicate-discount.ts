"use client";

import { useActionState, useTransition } from "react";
import { duplicateDiscount } from "@/modules/discounts/actions/admin/duplicate-discount";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export interface DuplicateDiscountSuccessData {
	id: string;
	code: string;
}

const isDuplicateDiscountSuccessData = (value: unknown): value is DuplicateDiscountSuccessData => {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as DuplicateDiscountSuccessData).id === "string" &&
		typeof (value as DuplicateDiscountSuccessData).code === "string"
	);
};

interface UseDuplicateDiscountOptions {
	onSuccess?: (message: string, data: DuplicateDiscountSuccessData) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer un code promo
 */
export function useDuplicateDiscount(options?: UseDuplicateDiscountOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			duplicateDiscount,
			createToastCallbacks({
				loadingMessage: "Duplication en cours...",
				showSuccessToast: false,
				onSuccess: (result) => {
					if (typeof result.message === "string" && isDuplicateDiscountSuccessData(result.data)) {
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

	const duplicate = (discountId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("discountId", discountId);
			formAction(formData);
		});
	};

	return {
		duplicate,
		isPending: isPending || isActionPending,
	};
}
