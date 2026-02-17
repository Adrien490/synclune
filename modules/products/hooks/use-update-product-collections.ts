"use client";

import { useActionState, useTransition } from "react";
import { updateProductCollections } from "@/modules/products/actions/update-product-collections";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseUpdateProductCollectionsOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour mettre à jour les collections d'un produit
 */
export function useUpdateProductCollections(
	options?: UseUpdateProductCollectionsOptions
) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			updateProductCollections,
			createToastCallbacks({
				loadingMessage: "Mise à jour des collections...",
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

	const update = (
		productId: string,
		collectionIds: string[]
	) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productId", productId);
			formData.append("collectionIds", JSON.stringify(collectionIds));
			formAction(formData);
		});
	};

	return {
		update,
		isPending,
	};
}
