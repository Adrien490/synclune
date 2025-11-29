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
import { useRemoveFromWishlist } from "@/modules/wishlist/hooks/use-remove-from-wishlist";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { AlertDialogData } from "@/shared/stores/alert-dialog-store";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const REMOVE_WISHLIST_ITEM_DIALOG_ID = "remove-wishlist-item";

type RemoveWishlistItemData = AlertDialogData & {
	skuId: string;
	itemId: string;
	itemName: string;
};

/**
 * Dialog de confirmation pour supprimer un article de la wishlist
 *
 * Pattern :
 * - Utilise le store AlertDialog pour gérer l'état
 * - useRemoveFromWishlist pour l'action serveur
 * - Source de vérité unique (DB) pour éviter désynchronisations
 * - Toast de confirmation après suppression réussie
 */
export function RemoveWishlistItemAlertDialog() {
	const removeDialog = useAlertDialog<RemoveWishlistItemData>(
		REMOVE_WISHLIST_ITEM_DIALOG_ID
	);

	const { action, isPending } = useRemoveFromWishlist({
		onSuccess: () => {
			removeDialog.close();

			// Toast de confirmation empathique
			toast.success("Article retiré de votre wishlist", {
				description: "Vous pourrez toujours le retrouver dans nos créations.",
			});
		},
	});
	// Note : Les erreurs sont déjà gérées par createToastCallbacks dans le hook

	// Wrapper de l'action pour fermer le dialog après soumission
	const handleAction = async (formData: FormData) => {
		// 1. Appel de la server action
		await action(formData);

		// 2. Fermer le dialog après succès (géré dans onSuccess callback)
	};

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			removeDialog.close();
		}
	};

	return (
		<AlertDialog open={removeDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={handleAction}>
					<input
						type="hidden"
						name="skuId"
						value={removeDialog.data?.skuId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>
							Retirer ce bijou de votre wishlist ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{removeDialog.data?.itemName ? (
								<>
									Vous voulez vraiment retirer{" "}
									<span className="font-medium text-foreground">
										{removeDialog.data.itemName}
									</span>{" "}
									de votre wishlist ?
								</>
							) : (
								"Vous voulez vraiment retirer ce bijou de votre wishlist ?"
							)}
							<br />
							<br />
							<span className="text-muted-foreground text-sm">
								Vous pourrez toujours le retrouver dans la boutique 💕
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button
							type="submit"
							disabled={isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Suppression...
								</>
							) : (
								"Supprimer"
							)}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
