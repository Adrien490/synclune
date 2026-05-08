"use client";

import { useActionState, useTransition } from "react";
import { duplicateSku } from "@/modules/skus/actions/duplicate-sku";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export interface DuplicateSkuSuccessData {
	id: string;
	sku: string;
	productId: string;
	productSlug: string;
}

const isDuplicateSkuSuccessData = (value: unknown): value is DuplicateSkuSuccessData => {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as DuplicateSkuSuccessData).id === "string" &&
		typeof (value as DuplicateSkuSuccessData).sku === "string" &&
		typeof (value as DuplicateSkuSuccessData).productId === "string" &&
		typeof (value as DuplicateSkuSuccessData).productSlug === "string"
	);
};

interface UseDuplicateSkuOptions {
	onSuccess?: (message: string, data: DuplicateSkuSuccessData) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer un SKU
 */
export function useDuplicateSku(options?: UseDuplicateSkuOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			duplicateSku,
			createToastCallbacks({
				loadingMessage: "Duplication en cours...",
				showSuccessToast: false,
				onSuccess: (result) => {
					if (typeof result.message === "string" && isDuplicateSkuSuccessData(result.data)) {
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

	const duplicate = (skuId: string, _skuName: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("skuId", skuId);
			formAction(formData);
		});
	};

	return {
		duplicate,
		isPending,
	};
}
