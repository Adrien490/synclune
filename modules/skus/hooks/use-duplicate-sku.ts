"use client";

import { useActionState, useTransition } from "react";
import { duplicateSku } from "@/modules/skus/actions/duplicate-sku";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

interface UseDuplicateSkuOptions {
	onSuccess?: (data: { id: string; sku: string }) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer un SKU
 */
export function useDuplicateSku(options?: UseDuplicateSkuOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				duplicateSku(formData.get("skuId") as string),
			createToastCallbacks({
				loadingMessage: "Duplication en cours...",
				onSuccess: (result) => {
					if (result.data) {
						options?.onSuccess?.(result.data as { id: string; sku: string });
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

	const duplicate = (skuId: string, _skuName: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("skuId", skuId);
			formAction(formData);
		});
	};

	return {
		duplicate,
		isPending: isPending || isActionPending,
	};
}
