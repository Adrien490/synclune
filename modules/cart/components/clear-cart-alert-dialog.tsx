"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useCartOptimisticSafe } from "../contexts/cart-optimistic-context";
import { useClearCart } from "../hooks/use-clear-cart";

import { CLEAR_CART_DIALOG_ID } from "./clear-cart-dialog-id";

/**
 * Dialog de confirmation pour vider intégralement le panier.
 *
 * Optimistic UI : dispatch `{ type: "clear" }` dans `CartOptimisticContext`
 * (le cart-sheet vide ses items instantanément) + le hook
 * `useClearCart` ramène le badge navbar à 0 — symétrique à
 * `RemoveCartItemAlertDialog`.
 *
 * La mise à jour optimistic ET l'action serveur DOIVENT s'exécuter dans
 * la même transition (celle de `cartOptimistic.startTransition` exposée par
 * le cart-sheet) sinon `useOptimistic` rollback dès la fin de la transition
 * locale, faisant clignoter les items vidés/restaurés.
 */
export function ClearCartAlertDialog() {
	const dialog = useAlertDialog(CLEAR_CART_DIALOG_ID);
	const haptic = useHaptic();
	const cartOptimistic = useCartOptimisticSafe();
	const { action } = useClearCart();

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		haptic("error");
		const formData = new FormData(e.currentTarget);

		if (cartOptimistic) {
			cartOptimistic.startTransition(() => {
				cartOptimistic.updateOptimisticCart({ type: "clear" });
				action(formData);
			});
			return;
		}

		// Fallback hors contexte (tests isolés, usage futur hors cart-sheet) :
		// le badge reste optimistic via le hook, mais les items ne disparaîtront
		// qu'après refresh serveur.
		action(formData);
	};

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			onSubmit={handleSubmit}
			tone="destructive"
			title="Vider ton panier ?"
			confirmLabel="Vider"
			description="Toutes les pièces de ton panier seront retirées. Tu pourras toujours les retrouver dans la boutique si tu changes d'avis."
		/>
	);
}
