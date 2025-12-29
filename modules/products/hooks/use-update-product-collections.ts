"use client";

import { useActionState, useTransition } from "react";
import { updateProductCollections } from "@/modules/products/actions/update-product-collections";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

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

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) => {
				const collectionIds = formData.getAll("collectionIds") as string[];
				return updateProductCollections(
					formData.get("productId") as string,
					collectionIds
				);
			},
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
		_productTitle: string,
		collectionIds: string[]
	) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("productId", productId);
			collectionIds.forEach((id) => formData.append("collectionIds", id));
			formAction(formData);
		});
	};

	return {
		update,
		isPending: isPending || isActionPending,
	};
}
