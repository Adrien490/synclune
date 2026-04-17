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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useClearCart } from "../hooks/use-clear-cart";
import { LoaderCircle } from "lucide-react";

import { CLEAR_CART_DIALOG_ID } from "./clear-cart-dialog-id";
export { CLEAR_CART_DIALOG_ID };

/**
 * Dialog de confirmation pour vider intégralement le panier.
 * Toast success/error auto via wrapper toast.
 */
export function ClearCartAlertDialog() {
	const dialog = useAlertDialog(CLEAR_CART_DIALOG_ID);
	const haptic = useHaptic();
	const { action, isPending } = useClearCart(() => dialog.close());

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) dialog.close();
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		haptic("error");
		action(new FormData(e.currentTarget));
	};

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form onSubmit={handleSubmit} aria-label="Vider le panier">
					<AlertDialogHeader>
						<AlertDialogTitle>Vider votre panier ?</AlertDialogTitle>
						<AlertDialogDescription>
							Tous les articles de votre panier seront supprimés. Vous pourrez toujours les
							retrouver dans la boutique si vous changez d&apos;avis.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Suppression..." : "Vider"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
