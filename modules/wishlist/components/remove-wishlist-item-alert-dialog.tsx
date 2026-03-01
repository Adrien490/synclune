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
import { AlertDialogData } from "@/shared/stores/alert-dialog-store";
import { WISHLIST_DIALOG_IDS } from "@/modules/wishlist/constants/dialog-ids";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type RemoveWishlistItemData = AlertDialogData & {
	productId: string;
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
	const removeDialog = useAlertDialog<RemoveWishlistItemData>(WISHLIST_DIALOG_IDS.REMOVE_ITEM);

	// Connect to optimistic list context for immediate visual feedback
	const wishlistListOptimistic = useWishlistListOptimistic();

	const { action, isPending } = useRemoveFromWishlist({
		onOptimisticRemove: wishlistListOptimistic?.onItemRemoved,
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
					<input type="hidden" name="productId" value={removeDialog.data?.productId ?? ""} />

					<AlertDialogHeader>
						<AlertDialogTitle>Retirer ce produit de votre wishlist ?</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									{removeDialog.data?.itemName ? (
										<>
											Vous voulez vraiment retirer{" "}
											<span className="text-foreground font-medium">
												{removeDialog.data.itemName}
											</span>{" "}
											de votre wishlist ?
										</>
									) : (
										"Vous voulez vraiment retirer ce produit de votre wishlist ?"
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
							{isPending && <Loader2 className="animate-spin" />}
							{isPending ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
