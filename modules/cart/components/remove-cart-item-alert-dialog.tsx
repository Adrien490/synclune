"use client";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useRemoveFromCart } from "../hooks/use-remove-from-cart";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useCartOptimisticSafe } from "../contexts/cart-optimistic-context";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/modules/cart/actions/add-to-cart";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";
import { Spinner } from "@/shared/components/ui/spinner";

export const REMOVE_CART_ITEM_DIALOG_ID = "remove-cart-item";

const UNDO_TOAST_DURATION_MS = 5000;

interface RemoveCartItemData {
	cartItemId: string;
	skuId?: string;
	itemName: string;
	quantity: number;
	[key: string]: unknown;
}

export function RemoveCartItemAlertDialog() {
	const removeDialog = useAlertDialog<RemoveCartItemData>(REMOVE_CART_ITEM_DIALOG_ID);
	const cartOptimistic = useCartOptimisticSafe();
	const haptic = useHaptic();
	const router = useRouter();
	const adjustCart = useBadgeCountsStore((state) => state.adjustCart);
	const [, startUndoTransition] = useTransition();

	// Undo via l'action du toast : l'item a déjà été supprimé optimistic + serveur
	// dans handleSubmit. L'undo recrée l'item via `addToCart` et restaure le badge.
	const buildToastUndoHandler = (skuId: string, quantity: number) => () => {
		adjustCart(quantity);
		const fd = new FormData();
		fd.set("skuId", skuId);
		fd.set("quantity", String(quantity));
		startUndoTransition(async () => {
			const result = await addToCart(undefined, fd);
			if (result.status === ActionStatus.SUCCESS) {
				// Pas de toast "Article restauré" : le retour de la ligne dans le
				// cart-sheet après router.refresh() est le feedback visuel.
				router.refresh();
			} else {
				adjustCart(-quantity);
				toast.error(result.message);
			}
		});
	};

	const showUndoToast = (skuId: string, quantity: number, itemName: string) => {
		toast.success(`${itemName} retiré du panier`, {
			duration: UNDO_TOAST_DURATION_MS,
			action: {
				label: "Annuler",
				onClick: buildToastUndoHandler(skuId, quantity),
			},
		});
	};

	const { action, isPending } = useRemoveFromCart({
		quantity: removeDialog.data?.quantity ?? 1,
		onSuccess: () => {
			const { skuId, quantity = 1, itemName = "Article" } = removeDialog.data ?? {};
			removeDialog.close();
			if (!skuId) return;
			showUndoToast(skuId, quantity, itemName);
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			removeDialog.close();
		}
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		haptic("error");
		const formData = new FormData(e.currentTarget);
		const { cartItemId } = removeDialog.data ?? {};

		if (cartItemId && cartOptimistic) {
			// Optimistic remove immédiat → l'item disparaît avant l'action,
			// puis (desktop) toast Sonner avec bouton "Annuler" en bas-droite.
			cartOptimistic.startTransition(() => {
				cartOptimistic.updateOptimisticCart({ type: "remove", itemId: cartItemId });
				action(formData);
			});
			return;
		}

		// Fallback (pas de context optimistic, ex: tests isolés) : action directe.
		action(formData);
	};

	return (
		<ResponsiveAlertDialog
			tone="destructive"
			open={removeDialog.isOpen}
			onOpenChange={handleOpenChange}
		>
			<ResponsiveAlertDialogContent>
				<form onSubmit={handleSubmit} aria-label="Supprimer l'article du panier">
					<input type="hidden" name="cartItemId" value={removeDialog.data?.cartItemId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Retirer ce produit de votre panier ?
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{removeDialog.data?.itemName
								? `Vous voulez vraiment retirer ${removeDialog.data.itemName} de votre panier ? Vous pourrez toujours le retrouver dans la boutique si vous changez d'avis !`
								: "Vous voulez vraiment retirer ce produit de votre panier ? Vous pourrez toujours le retrouver dans la boutique si vous changez d'avis !"}
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
							{isPending ? "Retrait…" : "Retirer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
