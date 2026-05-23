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
import { useCartOptimisticSafe } from "../contexts/cart-optimistic-context";
import { useClearCart } from "../hooks/use-clear-cart";
import { LoaderCircle } from "lucide-react";

import { CLEAR_CART_DIALOG_ID } from "./clear-cart-dialog-id";

/**
 * Dialog de confirmation pour vider intégralement le panier.
 *
 * Optimistic UI : dispatch `{ type: "clear" }` dans `CartOptimisticContext`
 * (le cart-sheet vide ses items + discount cache instantanément) + le hook
 * `useClearCart` ramène le badge navbar à 0 — symétrique à
 * `RemoveCartItemAlertDialog`.
 *
 * La mise à jour optimistic ET l'action serveur DOIVENT s'exécuter dans
 * la même transition (celle de `cartOptimistic.startTransition` exposée par
 * le cart-sheet) sinon `useOptimistic` rollback dès la fin de la transition
 * locale, faisant clignoter les items vidés/restaurés.
 */
export function ClearCartAlertDialog() {
	const dialog = useAlertDialog(CLEAR_CART_DIALOG_ID);
	const haptic = useHaptic();
	const cartOptimistic = useCartOptimisticSafe();
	const { action, isPending } = useClearCart(() => dialog.close());

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) dialog.close();
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		haptic("error");
		const formData = new FormData(e.currentTarget);

		if (cartOptimistic) {
			cartOptimistic.startTransition(() => {
				cartOptimistic.updateOptimisticCart({ type: "clear" });
				action(formData);
			});
			return;
		}

		// Fallback hors contexte (tests isolés, usage futur hors cart-sheet) :
		// le badge reste optimistic via le hook, mais les items ne disparaîtront
		// qu'après refresh serveur.
		action(formData);
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
							{isPending ? "Suppression…" : "Vider"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
