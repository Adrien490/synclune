"use client";

import { Button } from "@/shared/components/ui/button";
import { useAlertDialogStore } from "@/shared/providers/alert-dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { Trash2 } from "lucide-react";
import { CLEAR_CART_DIALOG_ID } from "./clear-cart-dialog-id";

interface CartClearButtonProps {
	disabled?: boolean;
}

/**
 * Bouton "Vider le panier" (header cart-sheet).
 * Ouvre le ClearCartAlertDialog via le store AlertDialog.
 */
export function CartClearButton({ disabled = false }: CartClearButtonProps) {
	const openAlertDialog = useAlertDialogStore((state) => state.openAlertDialog);
	const haptic = useHaptic();

	const handleClick = () => {
		haptic("light");
		openAlertDialog(CLEAR_CART_DIALOG_ID);
	};

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onClick={handleClick}
			disabled={disabled}
			aria-label="Vider le panier"
			className="text-muted-foreground hover:text-destructive active:text-destructive/80 size-11 shrink-0 group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
		>
			<Trash2 className="size-4" aria-hidden="true" />
		</Button>
	);
}
