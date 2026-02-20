"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useRemoveFromCart } from "../hooks/use-remove-from-cart";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useCartOptimisticSafe } from "../contexts/cart-optimistic-context";
import { Loader2 } from "lucide-react";

export const REMOVE_CART_ITEM_DIALOG_ID = "remove-cart-item";

interface RemoveCartItemData {
	cartItemId: string;
	itemName: string;
	quantity: number;
	[key: string]: unknown;
}

/**
 * Dialog de confirmation pour supprimer un article du panier
 *
 * Utilise le store AlertDialog pour gérer l'état
 * et le hook useRemoveFromCart pour l'action
 * Toast de confirmation après suppression réussie
 * Intégré avec CartOptimisticContext pour suppression visuelle immédiate
 */
export function RemoveCartItemAlertDialog() {
	const removeDialog = useAlertDialog<RemoveCartItemData>(
		REMOVE_CART_ITEM_DIALOG_ID
	);
	const cartOptimistic = useCartOptimisticSafe();

	const { action, isPending } = useRemoveFromCart({
		quantity: removeDialog.data?.quantity ?? 1,
		onSuccess: () => {
			// 1. Fermer le dialog
			removeDialog.close();
		},
	});
	// Note : Les erreurs sont déjà gérées par createToastCallbacks dans le hook

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			removeDialog.close();
		}
	};

	// Handler pour soumettre avec optimistic update
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const cartItemId = removeDialog.data?.cartItemId;

		if (cartItemId && cartOptimistic) {
			// Optimistic update : supprimer visuellement l'item immédiatement
			cartOptimistic.startTransition(() => {
				cartOptimistic.updateOptimisticCart({ type: "remove", itemId: cartItemId });
				action(formData);
			});
		} else {
			// Fallback si pas de contexte (ne devrait pas arriver)
			action(formData);
		}
	};

	return (
		<AlertDialog open={removeDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form onSubmit={handleSubmit} aria-label="Supprimer l'article du panier">
					<input
						type="hidden"
						name="cartItemId"
						value={removeDialog.data?.cartItemId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>
							Retirer ce produit de votre panier ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{removeDialog.data?.itemName
								? `Vous voulez vraiment retirer ${removeDialog.data.itemName} de votre panier ? Vous pourrez toujours le retrouver dans la boutique si vous changez d'avis !`
								: "Vous voulez vraiment retirer ce produit de votre panier ? Vous pourrez toujours le retrouver dans la boutique si vous changez d'avis !"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending}>
							{isPending ? "Retrait..." : "Retirer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
