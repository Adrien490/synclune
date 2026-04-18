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
import { useRemoveFromCart } from "../hooks/use-remove-from-cart";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useCartOptimisticSafe } from "../contexts/cart-optimistic-context";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { LoaderCircle } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/modules/cart/actions/add-to-cart";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";

export const REMOVE_CART_ITEM_DIALOG_ID = "remove-cart-item";

interface RemoveCartItemData {
	cartItemId: string;
	skuId?: string;
	itemName: string;
	quantity: number;
	[key: string]: unknown;
}

/**
 * Dialog de confirmation pour supprimer un article du panier
 *
 * Utilise le store AlertDialog pour gérer l'état
 * et le hook useRemoveFromCart pour l'action
 * Toast de confirmation après suppression réussie
 * Intégré avec CartOptimisticContext pour suppression visuelle immédiate
 */
export function RemoveCartItemAlertDialog() {
	const removeDialog = useAlertDialog<RemoveCartItemData>(REMOVE_CART_ITEM_DIALOG_ID);
	const cartOptimistic = useCartOptimisticSafe();
	const haptic = useHaptic();
	const router = useRouter();
	const [, startUndoTransition] = useTransition();

	const buildUndoHandler = (skuId: string, quantity: number) => () => {
		const fd = new FormData();
		fd.set("skuId", skuId);
		fd.set("quantity", String(quantity));
		startUndoTransition(async () => {
			const result = await addToCart(undefined, fd);
			if (result.status === ActionStatus.SUCCESS) {
				router.refresh();
				toast.success("Article restauré dans le panier");
			} else {
				toast.error(result.message);
			}
		});
	};

	const { action, isPending } = useRemoveFromCart({
		quantity: removeDialog.data?.quantity ?? 1,
		onSuccess: () => {
			const snapshot = removeDialog.data;
			// 1. Fermer le dialog
			removeDialog.close();

			// 2. Toast avec undo (si skuId dispo + itemName)
			if (snapshot?.skuId) {
				toast.success("Article retiré du panier", {
					description: snapshot.itemName
						? `${snapshot.itemName} · Vous pouvez annuler`
						: "Vous pouvez annuler",
					duration: 5000,
					action: {
						label: "Annuler",
						onClick: buildUndoHandler(snapshot.skuId, snapshot.quantity),
					},
				});
			} else {
				toast.success("Article retiré du panier");
			}
		},
		trackingData: removeDialog.data
			? {
					productId: removeDialog.data.cartItemId,
					productName: removeDialog.data.itemName,
				}
			: undefined,
	});
	// Note : Les erreurs sont déjà gérées par createToastCallbacks dans le hook

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			removeDialog.close();
		}
	};

	// Handler pour soumettre avec optimistic update
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		haptic("error");
		const formData = new FormData(e.currentTarget);
		const cartItemId = removeDialog.data?.cartItemId;

		if (cartItemId && cartOptimistic) {
			// Optimistic update : supprimer visuellement l'item immédiatement
			cartOptimistic.startTransition(() => {
				cartOptimistic.updateOptimisticCart({ type: "remove", itemId: cartItemId });
				action(formData);
			});
		} else {
			// Fallback si pas de contexte (ne devrait pas arriver)
			action(formData);
		}
	};

	return (
		<AlertDialog open={removeDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form onSubmit={handleSubmit} aria-label="Supprimer l'article du panier">
					<input type="hidden" name="cartItemId" value={removeDialog.data?.cartItemId ?? ""} />

					<AlertDialogHeader>
						<AlertDialogTitle>Retirer ce produit de votre panier ?</AlertDialogTitle>
						<AlertDialogDescription>
							{removeDialog.data?.itemName
								? `Vous voulez vraiment retirer ${removeDialog.data.itemName} de votre panier ? Vous pourrez toujours le retrouver dans la boutique si vous changez d'avis !`
								: "Vous voulez vraiment retirer ce produit de votre panier ? Vous pourrez toujours le retrouver dans la boutique si vous changez d'avis !"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Retrait..." : "Retirer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
