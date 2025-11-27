"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";
import { toggleProductTypeStatus } from "@/modules/product-types/actions/toggle-product-type-status";

interface UseToggleProductTypeStatusOptions {
	onSuccess?: (message: string) => void;
}

export const useToggleProductTypeStatus = (
	options?: UseToggleProductTypeStatusOptions
) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			toggleProductTypeStatus,
			createToastCallbacks({
				loadingMessage: "Changement de statut...",
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

	const toggleStatus = (productTypeId: string, isActive: boolean) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productTypeId", productTypeId);
			formData.append("isActive", isActive.toString());
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		toggleStatus,
	};
};
