"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { updateProductSkuStatus } from "@/modules/skus/actions/update-sku-status";

interface UseUpdateProductSkuStatusOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour mettre à jour le statut actif/inactif d'un SKU
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 */
export const useUpdateProductSkuStatus = (
	options?: UseUpdateProductSkuStatusOptions
) => {
	const [isPending, startTransition] = useTransition();
	const [state, action] = useActionState(
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
			})
		),
		undefined
	);

	const toggleStatus = (skuId: string, isActive: boolean) => {
		const formData = new FormData();
		formData.append("skuId", skuId);
		formData.append("isActive", String(isActive));
		startTransition(() => {
			action(formData);
		});
	};

	return {
		state,
		isPending,
		toggleStatus,
	};
};
