"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { updateProductCollections } from "@/modules/products/actions/update-product-collections";
import { ActionStatus } from "@/shared/types/server-action";

interface UseUpdateProductCollectionsOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour mettre à jour les collections d'un produit
 */
export function useUpdateProductCollections(options?: UseUpdateProductCollectionsOptions) {
	const [isPending, startTransition] = useTransition();

	const update = useCallback(
		(productId: string, productTitle: string, collectionIds: string[]) => {
			startTransition(async () => {
				const toastId = toast.loading(`Mise à jour des collections de ${productTitle}...`);

				try {
					const result = await updateProductCollections(productId, collectionIds);
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
		},
		[options]
	);

	return {
		update,
		isPending,
	};
}
