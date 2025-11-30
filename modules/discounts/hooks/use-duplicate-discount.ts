"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { duplicateDiscount } from "@/modules/discounts/actions/admin/duplicate-discount";
import { ActionStatus } from "@/shared/types/server-action";

interface UseDuplicateDiscountOptions {
	onSuccess?: (data: { id: string; code: string }) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer un code promo
 */
export function useDuplicateDiscount(options?: UseDuplicateDiscountOptions) {
	const [isPending, startTransition] = useTransition();

	const duplicate = useCallback(
		(discountId: string, discountCode: string) => {
			startTransition(async () => {
				const toastId = toast.loading(`Duplication de ${discountCode}...`);

				try {
					const result = await duplicateDiscount(discountId);
					toast.dismiss(toastId);

					if (result.status === ActionStatus.SUCCESS) {
						toast.success(result.message);
						if (result.data) {
							options?.onSuccess?.(result.data as { id: string; code: string });
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
		},
		[options]
	);

	return {
		duplicate,
		isPending,
	};
}
