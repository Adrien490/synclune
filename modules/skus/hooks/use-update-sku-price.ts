"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateSkuPrice } from "@/modules/skus/actions/admin/update-sku-price";
import { ActionStatus } from "@/shared/types/server-action";

interface UseUpdateSkuPriceOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour modifier rapidement le prix d'un SKU
 */
export function useUpdateSkuPrice(options?: UseUpdateSkuPriceOptions) {
	const [isPending, startTransition] = useTransition();

	const updatePrice = (skuId: string, skuName: string, priceInclTax: number, compareAtPrice?: number | null) => {
		startTransition(async () => {
			const formattedPrice = (priceInclTax / 100).toFixed(2);
			const toastId = toast.loading(`Mise à jour du prix de ${skuName} à ${formattedPrice}€...`);

			try {
				const result = await updateSkuPrice(skuId, priceInclTax, compareAtPrice);
				toast.dismiss(toastId);

				if (result.status === ActionStatus.SUCCESS) {
					toast.success(result.message);
					options?.onSuccess?.();
				} else {
					toast.error(result.message);
					options?.onError?.(result.message);
				}
			} catch (error) {
				toast.dismiss(toastId);
				const message =
					error instanceof Error ? error.message : "Erreur lors de la mise à jour";
				toast.error(message);
				options?.onError?.(message);
			}
		});
	};

	return {
		updatePrice,
		isPending,
	};
}
