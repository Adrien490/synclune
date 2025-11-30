"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { deleteDiscount } from "@/modules/discounts/actions/delete-discount";

interface UseDeleteDiscountOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteDiscount = (options?: UseDeleteDiscountOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteDiscount,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	return {
		state,
		action,
		isPending,
	};
};
