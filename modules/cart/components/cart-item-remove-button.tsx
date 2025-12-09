"use client";

import { useAlertDialogStore } from "@/shared/providers/alert-dialog-store-provider";
import { REMOVE_CART_ITEM_DIALOG_ID } from "./remove-cart-item-alert-dialog";

interface CartItemRemoveButtonProps {
	cartItemId: string;
	itemName: string;
	isPending?: boolean;
}

/**
 * Client Component pour le lien de suppression d'un article du panier
 * Compatible Next.js 16 + React 19.2
 *
 * Ouvre un AlertDialog de confirmation avant suppression
 */
export function CartItemRemoveButton({
	cartItemId,
	itemName,
	isPending = false,
}: CartItemRemoveButtonProps) {
	const openAlertDialog = useAlertDialogStore((state) => state.openAlertDialog);

	const handleRemove = () => {
		openAlertDialog(REMOVE_CART_ITEM_DIALOG_ID, {
			cartItemId,
			itemName,
		});
	};

	return (
		<button
			data-pending={isPending ? "" : undefined}
			type="button"
			onClick={handleRemove}
			disabled={isPending}
			className="min-h-11 min-w-11 px-2 text-sm text-foreground underline hover:text-destructive active:text-destructive/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
			aria-label={`Supprimer ${itemName} du panier`}
		>
			Supprimer
		</button>
	);
}
