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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useCartOptimisticSafe } from "../contexts/cart-optimistic-context";
import { useClearCart } from "../hooks/use-clear-cart";
import { Spinner } from "@/shared/components/ui/spinner";

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
		<ResponsiveAlertDialog tone="destructive" open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form onSubmit={handleSubmit} aria-label="Vider le panier">
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Vider votre panier ?</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Tous les articles de votre panier seront supprimés. Vous pourrez toujours les
							retrouver dans la boutique si vous changez d&apos;avis.
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
							{isPending ? "Suppression…" : "Vider"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
