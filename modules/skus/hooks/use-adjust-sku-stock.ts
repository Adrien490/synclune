"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { adjustSkuStock } from "@/modules/skus/actions/admin/adjust-sku-stock";
import { ActionStatus } from "@/shared/types/server-action";

interface UseAdjustSkuStockOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour ajuster le stock d'un SKU
 */
export function useAdjustSkuStock(options?: UseAdjustSkuStockOptions) {
	const [isPending, startTransition] = useTransition();

	const adjust = useCallback(
		(skuId: string, skuName: string, adjustment: number, reason?: string) => {
			startTransition(async () => {
				const adjustmentText = adjustment > 0 ? `+${adjustment}` : `${adjustment}`;
				const toastId = toast.loading(`Ajustement du stock de ${skuName} (${adjustmentText})...`);

				try {
					const result = await adjustSkuStock(skuId, adjustment, reason);
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
						error instanceof Error ? error.message : "Erreur lors de l'ajustement";
					toast.error(message);
					options?.onError?.(message);
				}
			});
		},
		[options]
	);

	return {
		adjust,
		isPending,
	};
}
