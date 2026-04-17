"use client";

import { useActionState } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateCustomizationInspirationProducts } from "../actions/update-customization-inspiration-products";

interface UseUpdateCustomizationInspirationProductsOptions {
	onSuccess?: () => void;
}

export function useUpdateCustomizationInspirationProducts(
	options?: UseUpdateCustomizationInspirationProductsOptions,
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCustomizationInspirationProducts,
			createToastCallbacks({
				loadingMessage: "Mise à jour des produits inspirants...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
