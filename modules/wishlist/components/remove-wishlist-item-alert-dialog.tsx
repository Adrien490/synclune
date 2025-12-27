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
import { useRemoveFromWishlist } from "@/modules/wishlist/hooks/use-remove-from-wishlist";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { AlertDialogData } from "@/shared/stores/alert-dialog-store";
import { WISHLIST_DIALOG_IDS } from "@/modules/wishlist/constants/dialog-ids";
import { toast } from "sonner";

type RemoveWishlistItemData = AlertDialogData & {
	productId: string;
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
		WISHLIST_DIALOG_IDS.REMOVE_ITEM
	);

	const { action, isPending } = useRemoveFromWishlist({
		onSuccess: () => {
			removeDialog.close();

			// Toast de confirmation empathique
			toast.success("Article retiré de ta wishlist", {
				description: "Tu pourras toujours le retrouver dans nos créations.",
			});
		},
	});
	// Note : Les erreurs sont déjà gérées par createToastCallbacks dans le hook

	// Wrapper de l'action pour fermer le dialog après soumission
	const handleAction = async (formData: FormData) => {
		// Guard: vérifier que productId est présent avant soumission
		const productId = removeDialog.data?.productId;
		if (!productId) {
			removeDialog.close();
			return;
		}

		// Appel de la server action (fermeture dialog gérée dans onSuccess callback)
		await action(formData);
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
						name="productId"
						value={removeDialog.data?.productId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>
							Retirer ce produit de ta wishlist ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{removeDialog.data?.itemName ? (
								<>
									Tu veux vraiment retirer{" "}
									<span className="font-medium text-foreground">
										{removeDialog.data.itemName}
									</span>{" "}
									de ta wishlist ?
								</>
							) : (
								"Tu veux vraiment retirer ce produit de ta wishlist ?"
							)}
							<br />
							<br />
							<span className="text-muted-foreground text-sm">
								Tu pourras toujours le retrouver dans la boutique<span aria-hidden="true"> 💕</span>
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
