"use client";

import { useActionState, useTransition } from "react";
import { updateSkuPrice } from "@/modules/skus/actions/update-sku-price";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseUpdateSkuPriceOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour modifier rapidement le prix d'un SKU
 * Note: Les prix sont en EUROS (convertis en centimes côté serveur)
 */
export function useUpdateSkuPrice(options?: UseUpdateSkuPriceOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			updateSkuPrice,
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

	/**
	 * Met à jour le prix d'un SKU
	 * @param skuId - ID du SKU
	 * @param _skuName - Nom du SKU (pour le message de confirmation)
	 * @param priceInclTaxEuros - Prix en euros (ex: 30.00)
	 * @param compareAtPriceEuros - Prix barré optionnel en euros
	 */
	const updatePrice = (
		skuId: string,
		_skuName: string,
		priceInclTaxEuros: number,
		compareAtPriceEuros?: number | null
	) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("skuId", skuId);
			formData.append("priceInclTaxEuros", String(priceInclTaxEuros));
			if (compareAtPriceEuros != null) {
				formData.append("compareAtPriceEuros", String(compareAtPriceEuros));
			}
			formAction(formData);
		});
	};

	return {
		updatePrice,
		isPending,
	};
}
