"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/modules/cart/actions/add-to-cart";

interface UseAddToCartOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour ajouter un article au panier
 * Compatible avec useActionState de React 19
 *
 * Affiche un toast de succès avec un bouton "Voir le panier" pour faciliter
 * la navigation vers le panier après ajout d'un article
 */
export const useAddToCart = (options?: UseAddToCartOptions) => {
	const router = useRouter();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			addToCart,
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
				// Use Sonner's recommended object format
				successAction: {
					label: "Voir le panier",
					onClick: () => router.push("/panier"),
				},
			})
		),
		undefined
	);

	return {
		state,
		action,
		isPending,
	};
};
