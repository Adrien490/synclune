"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useRemoveFromCart } from "../hooks/use-remove-from-cart";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useCartOptimisticSafe } from "../contexts/cart-optimistic-context";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/modules/cart/actions/add-to-cart";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";

export const REMOVE_CART_ITEM_DIALOG_ID = "remove-cart-item";

const UNDO_TOAST_DURATION_MS = 5000;

interface RemoveCartItemData {
	/**
	 * Identité de la ligne — le variantId. Depuis le passage du panier en cookie
	 * (2026-08-04) il n'y a plus de `CartItem.id` distinct : `cartItemId` et
	 * `variantId` étaient devenus la même valeur, portée deux fois.
	 */
	variantId: string;
	itemName: string;
	quantity: number;
	[key: string]: unknown;
}

export function RemoveCartItemAlertDialog() {
	const removeDialog = useAlertDialog<RemoveCartItemData>(REMOVE_CART_ITEM_DIALOG_ID);
	const cartOptimistic = useCartOptimisticSafe();
	const haptic = useHaptic();
	const router = useRouter();
	const adjustCart = useBadgeCountsStore((state) => state.adjustCart);
	const [, startUndoTransition] = useTransition();

	// Undo via l'action du toast : l'item a déjà été supprimé optimistic + serveur
	// dans handleSubmit. L'undo recrée l'item via `addToCart` et restaure le badge.
	const buildToastUndoHandler = (variantId: string, quantity: number) => () => {
		adjustCart(quantity);
		const fd = new FormData();
		fd.set("variantId", variantId);
		fd.set("quantity", String(quantity));
		startUndoTransition(async () => {
			const result = await addToCart(undefined, fd);
			if (result.status === ActionStatus.SUCCESS) {
				// Pas de toast "Article restauré" : le retour de la ligne dans le
				// cart-sheet après router.refresh() est le feedback visuel.
				router.refresh();
			} else {
				adjustCart(-quantity);
				toast.error(result.message);
			}
		});
	};

	const showUndoToast = (variantId: string, quantity: number, itemName: string) => {
		toast.success(`${itemName} retiré du panier`, {
			duration: UNDO_TOAST_DURATION_MS,
			action: {
				label: "Annuler",
				onClick: buildToastUndoHandler(variantId, quantity),
			},
		});
	};

	const { action } = useRemoveFromCart({
		quantity: removeDialog.data?.quantity ?? 1,
		onSuccess: () => {
			const { variantId, quantity = 1, itemName = "Article" } = removeDialog.data ?? {};
			removeDialog.close();
			if (!variantId) return;
			showUndoToast(variantId, quantity, itemName);
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		haptic("error");
		const formData = new FormData(e.currentTarget);
		const { variantId } = removeDialog.data ?? {};

		if (variantId && cartOptimistic) {
			// Optimistic remove immédiat → l'item disparaît avant l'action,
			// puis (desktop) toast Sonner avec bouton "Annuler" en bas-droite.
			cartOptimistic.startTransition(() => {
				cartOptimistic.updateOptimisticCart({ type: "remove", itemId: variantId });
				action(formData);
			});
			return;
		}

		// Fallback (pas de context optimistic, ex: tests isolés) : action directe.
		action(formData);
	};

	return (
		<ConfirmDialog
			open={removeDialog.isOpen}
			onClose={removeDialog.close}
			onSubmit={handleSubmit}
			tone="destructive"
			fields={{ variantId: removeDialog.data?.variantId }}
			title="Retirer cette pièce de ton panier ?"
			confirmLabel="Retirer"
			description={
				removeDialog.data?.itemName
					? `Tu veux vraiment retirer ${removeDialog.data.itemName} de ton panier ? Tu pourras toujours la retrouver dans la boutique si tu changes d'avis !`
					: "Tu veux vraiment retirer cette pièce de ton panier ? Tu pourras toujours la retrouver dans la boutique si tu changes d'avis !"
			}
		/>
	);
}
