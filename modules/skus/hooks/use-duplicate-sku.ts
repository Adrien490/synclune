"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { duplicateSku } from "@/modules/skus/actions/admin/duplicate-sku";
import { ActionStatus } from "@/shared/types/server-action";

interface UseDuplicateSkuOptions {
	onSuccess?: (data: { id: string; sku: string }) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer un SKU
 */
export function useDuplicateSku(options?: UseDuplicateSkuOptions) {
	const [isPending, startTransition] = useTransition();

	const duplicate = (skuId: string, skuName: string) => {
		startTransition(async () => {
			const toastId = toast.loading(`Duplication de ${skuName}...`);

			try {
				const result = await duplicateSku(skuId);
				toast.dismiss(toastId);

				if (result.status === ActionStatus.SUCCESS) {
					toast.success(result.message);
					if (result.data) {
						options?.onSuccess?.(result.data as { id: string; sku: string });
					}
				} else {
					toast.error(result.message);
					options?.onError?.(result.message);
				}
			} catch (error) {
				toast.dismiss(toastId);
				const message =
					error instanceof Error ? error.message : "Erreur lors de la duplication";
				toast.error(message);
				options?.onError?.(message);
			}
		});
	};

	return {
		duplicate,
		isPending,
	};
}
