"use client";

import { updateOrderStatus } from "../actions/update-order-status";
import type { OrderTransitionKey } from "../schemas/order.schemas";
import { useOrderAction } from "./use-order-action";

interface UseUpdateOrderStatusOptions {
	onSuccess?: () => void;
}

/**
 * Message de chargement par transition — il décrit le GESTE, donc il appartient à
 * la transition, pas au composant qui l'appelle (les cinq hooks supprimés le
 * portaient déjà en dur chacun de leur côté).
 */
const LOADING_MESSAGES: Record<OrderTransitionKey, string> = {
	processing: "Marquage en préparation…",
	delivered: "Marquage comme livrée…",
	returned: "Marquage comme retournée…",
	"revert-to-processing": "Retour en préparation…",
	"undo-return": "Annulation du retour…",
};

/**
 * Hook des transitions de statut NON MONÉTAIRES.
 *
 * Remplace `use-mark-as-processing`, `use-mark-as-delivered`,
 * `use-mark-as-returned`, `use-revert-to-processing` et `use-undo-return` —
 * cinq wrappers qui ne faisaient que passer une action différente au même
 * `useOrderAction`.
 *
 * La clé de transition est injectée dans le `FormData` ici plutôt que par un
 * champ caché du formulaire : elle décrit un CHEMIN de code, pas une saisie de
 * l'utilisatrice. Elle reste malgré tout re-validée côté serveur par le Zod enum
 * d'`updateOrderStatusSchema` — un endpoint `"use server"` est appelable hors UI.
 */
export function useUpdateOrderStatus(
	transition: OrderTransitionKey,
	options: UseUpdateOrderStatusOptions = {},
) {
	const { state, action, isPending } = useOrderAction(
		async (prev, formData) => {
			formData.set("transition", transition);
			return updateOrderStatus(prev, formData);
		},
		{ loadingMessage: LOADING_MESSAGES[transition], onSuccess: options.onSuccess },
	);

	return { state, action, isPending };
}
