"use client";

import { useActionState, useTransition } from "react";
import { updateSkuPrice } from "@/modules/skus/actions/update-sku-price";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

interface UseUpdateSkuPriceOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour modifier rapidement le prix d'un SKU
 */
export function useUpdateSkuPrice(options?: UseUpdateSkuPriceOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) => {
				const compareAtPriceRaw = formData.get("compareAtPrice");
				const compareAtPrice = compareAtPriceRaw
					? Number(compareAtPriceRaw)
					: null;
				return updateSkuPrice(
					formData.get("skuId") as string,
					Number(formData.get("priceInclTax")),
					compareAtPrice
				);
			},
			createToastCallbacks({
				loadingMessage: "Mise à jour du prix...",
				onSuccess: () => {
					options?.onSuccess?.();
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

	const updatePrice = (
		skuId: string,
		_skuName: string,
		priceInclTax: number,
		compareAtPrice?: number | null
	) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("skuId", skuId);
			formData.append("priceInclTax", String(priceInclTax));
			if (compareAtPrice != null) {
				formData.append("compareAtPrice", String(compareAtPrice));
			}
			formAction(formData);
		});
	};

	return {
		updatePrice,
		isPending: isPending || isActionPending,
	};
}
