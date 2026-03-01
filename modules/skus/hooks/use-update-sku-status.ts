"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { updateProductSkuStatus } from "@/modules/skus/actions/update-sku-status";

interface UseUpdateProductSkuStatusOptions {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}

/**
 * Hook pour mettre à jour le statut actif/inactif d'un SKU
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 */
export const useUpdateProductSkuStatus = (options?: UseUpdateProductSkuStatusOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateProductSkuStatus,
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

	// No startTransition here — callers wrap this in their own
	// startTransition alongside useOptimistic updates.
	const toggleStatus = (skuId: string, isActive: boolean) => {
		const formData = new FormData();
		formData.append("skuId", skuId);
		formData.append("isActive", String(isActive));
		action(formData);
	};

	return {
		state,
		isPending,
		toggleStatus,
	};
};
