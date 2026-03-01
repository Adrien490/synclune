"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { toggleProductTypeStatus } from "@/modules/product-types/actions/toggle-product-type-status";

interface UseToggleProductTypeStatusOptions {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}

export const useToggleProductTypeStatus = (options?: UseToggleProductTypeStatusOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			toggleProductTypeStatus,
			createToastCallbacks({
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
				onError: () => {
					options?.onError?.();
				},
			}),
		),
		undefined,
	);

	// No startTransition here — callers (e.g. ProductTypeActiveToggle) wrap
	// this in their own startTransition alongside useOptimistic updates,
	// ensuring the optimistic state persists until the action resolves.
	const toggleStatus = (productTypeId: string, isActive: boolean) => {
		const formData = new FormData();
		formData.append("productTypeId", productTypeId);
		formData.append("isActive", isActive.toString());
		action(formData);
	};

	return {
		state,
		action,
		isPending,
		toggleStatus,
	};
};
