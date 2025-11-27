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
import { useClearWishlist } from "@/modules/wishlist/hooks/use-clear-wishlist";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const CLEAR_WISHLIST_DIALOG_ID = "clear-wishlist";

interface ClearWishlistData {
	itemCount: number;
	[key: string]: unknown;
}

/**
 * Dialog de confirmation pour vider complètement la wishlist
 *
 * Utilise le store AlertDialog pour gérer l'état
 * et le hook useClearWishlist pour l'action
 * Toast de confirmation après suppression réussie
 */
export function ClearWishlistAlertDialog() {
	const clearDialog = useAlertDialog<ClearWishlistData>(
		CLEAR_WISHLIST_DIALOG_ID
	);

	const { action, isPending } = useClearWishlist({
		onSuccess: (message) => {
			clearDialog.close();

			// Toast de confirmation empathique
			toast.success("Wishlist vidée", {
				description: message,
			});
		},
	});
	// Note : Les erreurs sont déjà gérées par createToastCallbacks dans le hook

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			clearDialog.close();
		}
	};

	const itemCount = clearDialog.data?.itemCount ?? 0;

	return (
		<AlertDialog open={clearDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Vider votre wishlist ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Vous voulez vraiment retirer{" "}
							<span className="font-medium text-foreground">
								{itemCount === 1
									? "l'article"
									: `les ${itemCount} articles`}
							</span>{" "}
							de votre wishlist ?
							<br />
							<br />
							<span className="text-muted-foreground text-sm">
								Bon, pas de panique ! Vous pourrez toujours retrouver ces bijoux dans la boutique 💕
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
								"Vider la wishlist"
							)}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
