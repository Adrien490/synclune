"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useRef, useTransition } from "react";
import { addToCart } from "@/modules/cart/actions/add-to-cart";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { useSheetStore } from "@/shared/providers/overlay-store-provider";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { FUNNEL_EVENTS, trackEvent } from "@/shared/lib/analytics/track";
import { announce } from "@/shared/utils/announce";
import type { ActionState } from "@/shared/types/server-action";

interface UseAddToCartOptions {
	onSuccess?: (message: string) => void;
	/** Ouvrir le cart sheet apres ajout reussi (defaut: true) */
	openSheetOnSuccess?: boolean;
	/**
	 * Afficher un toast d'erreur en cas d'echec (defaut: true).
	 * Desactive sur la page produit ou l'indisponibilite est deja visible inline.
	 */
	showErrorToast?: boolean;
}

/**
 * Hook pour ajouter un article au panier
 * Compatible avec useActionState de React 19
 *
 * Sheet s'ouvre apres succes du server action.
 * Toast d'erreur uniquement en cas de probleme.
 */
export const useAddToCart = (options?: UseAddToCartOptions) => {
	// Store pour optimistic UI du badge navbar
	const adjustCart = useBadgeCountsStore((state) => state.adjustCart);

	// Store pour ouvrir le cart sheet
	const openSheet = useSheetStore((state) => state.open);
	const shouldOpenSheet = options?.openSheetOnSuccess ?? true;

	// Ref pour stocker la quantité en cours pour le rollback
	const pendingQuantityRef = useRef(1);

	const [isTransitionPending, startTransition] = useTransition();

	const [state, formAction, isActionPending] = useActionState(
		// L'arrow diffère la création des callbacks au submit : ils lisent une ref
		// (`pendingQuantityRef`), interdit pendant le rendu (react-hooks/refs).
		// Ne pas « simplifier » en passage direct de withCallbacks.
		async (prev: ActionState | undefined, formData: FormData) =>
			withCallbacks(
				addToCart,
				createToastCallbacks({
					showSuccessToast: false,
					showErrorToast: options?.showErrorToast ?? true,
					onSuccess: (result: unknown) => {
						triggerHaptic("success");
						/*
						 * Pas de toast : l'ouverture du cart sheet EST le feedback visible
						 * (`showSuccessToast: false` ci-dessus). Mais un lecteur d'écran ne
						 * « voit » pas ce sheet comme une confirmation d'ajout, et les deux
						 * autres canaux échouaient :
						 *  - la région de `cart-sheet.tsx` se monte AVEC le sheet, donc au
						 *    même frame que son texte → jamais vocalisée ;
						 *  - celle de `CountBadge` était gatée sur `count > 0`, donc muette
						 *    au tout premier ajout (corrigé, mais elle annonce un total de
						 *    panier, pas l'ajout lui-même).
						 * D'où l'annonce explicite dans le canal global toujours monté.
						 */
						announce("Article ajouté au panier");
						if (shouldOpenSheet) {
							openSheet("cart");
						}
						trackEvent(FUNNEL_EVENTS.ADD_TO_CART, {
							quantity: pendingQuantityRef.current,
						});
						if (
							result &&
							typeof result === "object" &&
							"message" in result &&
							typeof result.message === "string"
						) {
							options?.onSuccess?.(result.message);
						}
					},
					onError: () => {
						triggerHaptic("error");
						// Rollback du badge navbar avec la quantite reelle
						// Sheet ne s'ouvre PAS en cas d'erreur
						adjustCart(-pendingQuantityRef.current);
					},
				}),
			)(prev, formData),
		undefined,
	);

	const action = (formData: FormData) => {
		const quantity = Number(formData.get("quantity")) || 1;
		pendingQuantityRef.current = quantity;

		startTransition(() => {
			// Mise a jour optimistic du badge navbar avec la quantite reelle
			adjustCart(quantity);
			formAction(formData);
		});
	};

	return {
		state,
		action,
		isPending: isTransitionPending || isActionPending,
	};
};
