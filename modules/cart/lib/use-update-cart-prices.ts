"use client";

import { useActionState } from "react";
import { updateCartPrices } from "./update-cart-prices";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";

/**
 * Hook pour utiliser l'action de mise à jour des prix du panier
 * avec gestion automatique des toasts de succès/erreur
 */
export function useUpdateCartPrices() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCartPrices,
			createToastCallbacks({
				loadingMessage: "Mise à jour des prix...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
