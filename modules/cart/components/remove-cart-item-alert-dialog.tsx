"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useRemoveFromCart } from "../hooks/use-remove-from-cart";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const REMOVE_CART_ITEM_DIALOG_ID = "remove-cart-item";

interface RemoveCartItemData {
	cartItemId: string;
	itemName: string;
	[key: string]: unknown;
}

/**
 * Dialog de confirmation pour supprimer un article du panier
 *
 * Utilise le store AlertDialog pour gérer l'état
 * et le hook useRemoveFromCart pour l'action
 * Toast de confirmation après suppression réussie
 */
export function RemoveCartItemAlertDialog() {
	const removeDialog = useAlertDialog<RemoveCartItemData>(
		REMOVE_CART_ITEM_DIALOG_ID
	);

	const { action, isPending } = useRemoveFromCart({
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

	return (
		<AlertDialog open={removeDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action} aria-label="Supprimer l'article du panier">
					<input
						type="hidden"
						name="cartItemId"
						value={removeDialog.data?.cartItemId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>
							Retirer ce produit de ton panier ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{removeDialog.data?.itemName
								? `Tu veux vraiment retirer ${removeDialog.data.itemName} de ton panier ? Tu pourras toujours le retrouver dans la boutique si tu changes d'avis !`
								: "Tu veux vraiment retirer ce produit de ton panier ? Tu pourras toujours le retrouver dans la boutique si tu changes d'avis !"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Retrait..." : "Retirer"}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
