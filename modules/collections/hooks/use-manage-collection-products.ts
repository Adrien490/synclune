"use client";

import { useActionState, useTransition } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { addProductsToCollection } from "@/modules/collections/actions/add-products-to-collection";
import { removeProductsFromCollection } from "@/modules/collections/actions/remove-products-from-collection";

interface UseManageCollectionProductsOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook unifie pour attacher/detacher plusieurs produits d'une collection.
 * Utilise deux useActionState distincts mais partage l'etat de pending via useTransition.
 */
export const useManageCollectionProducts = (options?: UseManageCollectionProductsOptions) => {
	const [addState, addAction, isAddPending] = useActionState(
		withCallbacks(
			addProductsToCollection,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			}),
		),
		undefined,
	);

	const [removeState, removeAction, isRemovePending] = useActionState(
		withCallbacks(
			removeProductsFromCollection,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			}),
		),
		undefined,
	);

	const [isTransitionPending, startTransition] = useTransition();

	const addProducts = (collectionId: string, productIds: string[]) => {
		const formData = new FormData();
		formData.append("collectionId", collectionId);
		formData.append("productIds", JSON.stringify(productIds));
		startTransition(() => {
			addAction(formData);
		});
	};

	const removeProducts = (collectionId: string, productIds: string[]) => {
		const formData = new FormData();
		formData.append("collectionId", collectionId);
		formData.append("productIds", JSON.stringify(productIds));
		startTransition(() => {
			removeAction(formData);
		});
	};

	return {
		addState,
		removeState,
		addProducts,
		removeProducts,
		isPending: isAddPending || isRemovePending || isTransitionPending,
	};
};
