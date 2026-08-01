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
import { useUndoReturn } from "@/modules/orders/hooks/use-undo-return";
import { Spinner } from "@/shared/components/ui/spinner";

export const UNDO_RETURN_DIALOG_ID = "undo-return";

interface UndoReturnData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

/**
 * Annulation d'un retour saisi par erreur — sortie de l'état RETURNED,
 * jusqu'ici absorbant (audit « Livraison et tracking » 2026-08-01).
 */
export function UndoReturnAlertDialog() {
	const dialog = useAlertDialog<UndoReturnData>(UNDO_RETURN_DIALOG_ID);

	const { action, isPending } = useUndoReturn({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="warning">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.orderId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Annuler le retour</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Annuler le retour de la commande <strong>{dialog.data?.orderNumber}</strong> ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Le statut de livraison repassera à &quot;Livré&quot;. Un remboursement déjà créé
									n&apos;est pas affecté.
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
							{isPending ? "Annulation…" : "Annuler le retour"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
