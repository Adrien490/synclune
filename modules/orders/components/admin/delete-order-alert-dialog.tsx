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
import { useDeleteOrder } from "@/modules/orders/hooks/use-delete-order";
import { LoaderCircle } from "lucide-react";

export const DELETE_ORDER_DIALOG_ID = "delete-order";

interface DeleteOrderData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function DeleteOrderAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteOrderData>(DELETE_ORDER_DIALOG_ID);

	const { action, isPending } = useDeleteOrder({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	return (
		<ResponsiveAlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={deleteDialog.data?.orderId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Confirmer la suppression</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir supprimer la commande{" "}
									<strong>{deleteDialog.data?.orderNumber}</strong> ?
								</p>
								<p className="text-destructive mt-2 font-medium">Cette action est irréversible.</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Note: Seules les commandes sans facture et non payées peuvent être supprimées
									(commandes de test, abandonnées ou échouées).
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Suppression…" : "Supprimer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
