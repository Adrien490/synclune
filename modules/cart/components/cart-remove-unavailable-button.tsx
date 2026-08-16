"use client";

import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useRemoveUnavailableItems } from "../hooks/use-remove-unavailable-items";
import { useCartOptimisticSafe } from "../contexts/cart-optimistic-context";
import type { CartItem } from "../types/cart.types";

interface CartRemoveUnavailableButtonProps {
	/** Les lignes fautives listées par l'alerte stock — celles que le clic retire. */
	itemsWithIssues: CartItem[];
}

/**
 * One-click fix de l'alerte « Ajuste ton panier pour continuer » : retire d'un
 * geste toutes les lignes en rupture ou indisponibles, au lieu de laisser la
 * cliente les supprimer une à une.
 *
 * C'est le déclencheur UI de `removeUnavailableItems` — l'action existait sans
 * aucun appelant (le motif exact pour lequel `remove-multiple-items` et
 * `move-to-wishlist` ont été supprimées) ; la câbler ici était l'alternative à
 * sa suppression (audit panier 2026-08-15).
 *
 * Optimistic UI sur le modèle de `RemoveCartItemAlertDialog` : les lignes
 * disparaissent dans la MÊME transition que l'action (sinon `useOptimistic`
 * rollback à la fin de la transition locale et les lignes clignotent). Le badge
 * navbar est ajusté par le hook au succès.
 */
export function CartRemoveUnavailableButton({ itemsWithIssues }: CartRemoveUnavailableButtonProps) {
	const haptic = useHaptic();
	const cartOptimistic = useCartOptimisticSafe();

	const unavailableQuantity = itemsWithIssues.reduce((sum, item) => sum + item.quantity, 0);
	const { action, isPending } = useRemoveUnavailableItems({ unavailableQuantity });

	const handleClick = () => {
		haptic("error");
		const formData = new FormData();

		if (cartOptimistic) {
			cartOptimistic.startTransition(() => {
				for (const item of itemsWithIssues) {
					cartOptimistic.updateOptimisticCart({ type: "remove", itemId: item.id });
				}
				action(formData);
			});
			return;
		}

		// Fallback hors contexte (tests isolés) : action directe, sans optimistic.
		action(formData);
	};

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={handleClick}
			disabled={isPending}
			// Même grammaire que le bouton « Actualiser les prix » de l'alerte voisine :
			// la teinte reste sur la bordure, le libellé en --foreground.
			className="border-destructive/40 mt-2 w-full sm:w-auto"
		>
			{isPending ? "Retrait…" : "Retirer ces articles"}
		</Button>
	);
}
