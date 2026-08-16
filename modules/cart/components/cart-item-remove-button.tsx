"use client";

import { useAlertDialogStore } from "@/shared/providers/overlay-store-provider";
import { REMOVE_CART_ITEM_DIALOG_ID } from "./remove-cart-item-alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { TrashIcon } from "@phosphor-icons/react/ssr";

interface CartItemRemoveButtonProps {
	/** Identité de la ligne — le variantId depuis le passage du panier en cookie. */
	variantId: string;
	itemName: string;
	quantity: number;
}

/**
 * Client Component pour le lien de suppression d'un article du panier
 * Compatible Next.js 16 + React 19.2
 *
 * Ouvre un AlertDialog de confirmation avant suppression.
 * Pas de state disabled/loader : la suppression est optimistic.
 */
export function CartItemRemoveButton({ variantId, itemName, quantity }: CartItemRemoveButtonProps) {
	const openAlertDialog = useAlertDialogStore((state) => state.openAlertDialog);
	const haptic = useHaptic();

	const handleRemove = () => {
		haptic("light");
		openAlertDialog(REMOVE_CART_ITEM_DIALOG_ID, {
			variantId,
			itemName,
			quantity,
		});
	};

	return (
		<Button
			type="button"
			variant="link"
			onClick={handleRemove}
			className="text-foreground can-hover:hover:text-destructive active:text-destructive/80 min-h-11 min-w-11 px-2 text-sm"
			aria-label={`Supprimer ${itemName} du panier`}
		>
			<TrashIcon className="size-4 sm:hidden" aria-hidden="true" />
			<span className="hidden sm:inline">Supprimer</span>
		</Button>
	);
}
