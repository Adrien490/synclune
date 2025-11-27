"use client";

import { useActionState } from "react";
import { updateCartItem } from "@/modules/cart/actions/update-cart-item";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";

/**
 * Hook pour mettre à jour la quantité d'un article du panier
 * Utilise la source de vérité unique (DB) pour éviter les désynchronisations
 *
 * Compatible React 19.2 + Next.js 16
 * - useActionState pour la server action
 * - isPending pour feedback visuel (boutons désactivés)
 * - Toast uniquement en cas d'erreur
 * - Revalidation automatique via updateTag()
 *
 * Usage:
 * ```tsx
 * const { action, isPending } = useUpdateCartItemQuantity()
 *
 * <form action={action}>
 *   <input type="hidden" name="quantity" value={newQuantity} />
 *   <button type="submit" disabled={isPending}>+</button>
 * </form>
 * ```
 */
export const useUpdateCartItemQuantity = () => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCartItem,
			createToastCallbacks({
				showSuccessToast: false, // Pas de toast succès (revalidation suffit)
				showErrorToast: true, // Toast erreur pour informer l'utilisateur
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
