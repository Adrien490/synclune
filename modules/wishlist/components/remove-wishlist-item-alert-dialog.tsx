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
import { useWishlistListOptimistic } from "@/modules/wishlist/contexts/wishlist-list-optimistic-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { type AlertDialogData } from "@/shared/stores/alert-dialog-store";
import { WISHLIST_DIALOG_IDS } from "@/modules/wishlist/constants/dialog-ids";
import { LoaderCircle } from "lucide-react";

type RemoveWishlistItemData = AlertDialogData & {
	productId: string;
	itemName: string;
};

/**
 * Dialog de confirmation pour supprimer un article de la wishlist
 *
 * Suppression directe : à la confirmation, l'item est retiré optimistiquement
 * via `WishlistListOptimisticContext` (`onItemRemoved`), sans fenêtre d'annulation.
 */
export function RemoveWishlistItemAlertDialog() {
	const removeDialog = useAlertDialog<RemoveWishlistItemData>(WISHLIST_DIALOG_IDS.REMOVE_ITEM);

	const wishlistListOptimistic = useWishlistListOptimistic();

	const { action, isPending } = useRemoveFromWishlist({
		onOptimisticRemove: (id) => wishlistListOptimistic?.onItemRemoved(id),
		onSuccess: () => {
			removeDialog.close();
		},
	});

	const handleAction = async (formData: FormData) => {
		const productId = removeDialog.data?.productId;
		if (!productId) {
			removeDialog.close();
			return;
		}
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
					<input type="hidden" name="productId" value={removeDialog.data?.productId ?? ""} />

					<AlertDialogHeader>
						<AlertDialogTitle>Retirer ce produit de vos favoris ?</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									{removeDialog.data?.itemName ? (
										<>
											Vous voulez vraiment retirer{" "}
											<span className="text-foreground font-medium">
												{removeDialog.data.itemName}
											</span>{" "}
											de vos favoris ?
										</>
									) : (
										"Vous voulez vraiment retirer ce produit de vos favoris ?"
									)}
								</p>
								<p className="text-muted-foreground text-sm">
									Vous pourrez toujours le retrouver dans la boutique
									<span aria-hidden="true"> 💕</span>
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Suppression…" : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
