"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";
import { setDefaultSku } from "@/modules/skus/actions/set-default-sku";

interface UseSetDefaultSkuOptions {
	onSuccess?: (message: string) => void;
}

export const useSetDefaultSku = (options?: UseSetDefaultSkuOptions) => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			setDefaultSku,
			createToastCallbacks({
				loadingMessage: "Définition de la variante par défaut...",
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

	const setAsDefault = (skuId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("skuId", skuId);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		setAsDefault,
	};
};
