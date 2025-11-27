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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { DeleteOrderWrapper } from "./delete-order-wrapper";

export const DELETE_ORDER_DIALOG_ID = "delete-order";

interface DeleteOrderData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function DeleteOrderAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteOrderData>(DELETE_ORDER_DIALOG_ID);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			deleteDialog.close();
		}
	};

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Es-tu sûr de vouloir supprimer la commande{" "}
								<strong>{deleteDialog.data?.orderNumber}</strong> ?
							</p>
							<p className="text-destructive mt-2 font-medium">
								Cette action est irréversible.
							</p>
							<p className="text-muted-foreground mt-4 text-sm">
								Note: Seules les commandes sans facture et non payées peuvent
								être supprimées (commandes de test, abandonnées ou échouées).
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<DeleteOrderWrapper orderId={deleteDialog.data?.orderId ?? ""}>
						<Button variant="destructive">Supprimer</Button>
					</DeleteOrderWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
