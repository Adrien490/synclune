"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearCart } from "../actions/clear-cart";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import type { ActionState } from "@/shared/types/server-action";

/**
 * Hook pour vider intégralement le panier (reset items + discount + notes).
 *
 * Toast d'erreur uniquement — le toast de succès « N articles supprimés » est
 * volontairement supprimé (le panier vide est sa propre confirmation visuelle).
 *
 * Optimistic UI :
 * - Le badge navbar est ramené à 0 immédiatement (snapshot du `cartCount` pour
 *   rollback en cas d'erreur serveur). Pattern symétrique à [[use-remove-from-cart]].
 * - L'optimistic clear des items du `cart-sheet` est dispatché par l'appelant
 *   (`ClearCartAlertDialog`) via `CartOptimisticContext` pour que la mise à
 *   jour persiste dans la même transition que l'action.
 */
export function useClearCart(onSuccess?: () => void) {
	const router = useRouter();
	const adjustCart = useBadgeCountsStore((state) => state.adjustCart);
	const cartCount = useBadgeCountsStore((state) => state.cartCount);

	// Snapshot pour rollback : on capture la valeur au moment de l'action,
	// pas au render, pour rester juste si l'utilisateur ajoute des items
	// pendant que le dialog est ouvert.
	const pendingCountRef = useRef(0);

	const [state, formAction, isPending] = useActionState(
		async (prev: ActionState | undefined, formData: FormData) =>
			withCallbacks(
				clearCart,
				createToastCallbacks({
					loadingMessage: "Vidage du panier…",
					showSuccessToast: false,
					showErrorToast: true,
					onSuccess: () => onSuccess?.(),
					onError: () => {
						adjustCart(pendingCountRef.current);
						router.refresh();
					},
				}),
			)(prev, formData),
		undefined,
	);

	const action = (formData: FormData) => {
		pendingCountRef.current = cartCount;
		// Badge → 0 immédiat (Math.max dans le store clamp si delta dépasse).
		if (cartCount > 0) adjustCart(-cartCount);
		formAction(formData);
	};

	return { state, action, isPending };
}
