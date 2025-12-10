"use client";

import { useAlertDialogStore } from "@/shared/providers/alert-dialog-store-provider";
import { REMOVE_CART_ITEM_DIALOG_ID } from "./remove-cart-item-alert-dialog";
import { Button } from "@/shared/components/ui/button";

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
		<Button
			data-pending={isPending ? "" : undefined}
			type="button"
			variant="link"
			onClick={handleRemove}
			disabled={isPending}
			className="min-h-11 min-w-11 px-2 text-sm text-foreground hover:text-destructive active:text-destructive/80 group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
			aria-label={`Supprimer ${itemName} du panier`}
		>
			Supprimer
		</Button>
	);
}
