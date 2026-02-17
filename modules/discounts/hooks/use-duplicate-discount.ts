"use client";

import { useActionState, useTransition } from "react";
import { duplicateDiscount } from "@/modules/discounts/actions/admin/duplicate-discount";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseDuplicateDiscountOptions {
	onSuccess?: (data: { id: string; code: string }) => void;
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
				onSuccess: (result) => {
					if (result.data) {
						options?.onSuccess?.(result.data as { id: string; code: string });
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
