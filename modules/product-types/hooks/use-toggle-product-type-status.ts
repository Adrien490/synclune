"use client";

import { toggleProductTypeStatus } from "@/modules/product-types/actions/toggle-product-type-status";
import { useActionStateWithToast } from "@/shared/hooks/use-action-state-with-toast";

interface UseToggleProductTypeStatusOptions {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}

export const useToggleProductTypeStatus = (options?: UseToggleProductTypeStatusOptions) => {
	// No startTransition here — callers (e.g. ProductTypeActiveToggle) wrap
	// this in their own startTransition alongside useOptimistic updates,
	// ensuring the optimistic state persists until the action resolves.
	const { state, action, isPending } = useActionStateWithToast(toggleProductTypeStatus, {
		loadingMessage: "Mise à jour du statut…",
		useOwnTransition: false,
		onSuccess: (message) => {
			if (message) options?.onSuccess?.(message);
		},
		onError: () => options?.onError?.(),
	});

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
