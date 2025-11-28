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
import { MarkAsReturnedWrapper } from "./mark-as-returned-wrapper";

export const MARK_AS_RETURNED_DIALOG_ID = "mark-as-returned";

interface MarkAsReturnedData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsReturnedAlertDialog() {
	const dialog = useAlertDialog<MarkAsReturnedData>(MARK_AS_RETURNED_DIALOG_ID);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			dialog.close();
		}
	};

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Marquer comme retourné</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Es-tu sûr de vouloir marquer la commande{" "}
								<strong>{dialog.data?.orderNumber}</strong> comme retournée ?
							</p>
							<p className="text-muted-foreground mt-4 text-sm">
								Le statut de livraison passera à "Retourné". Tu pourras ensuite
								créer un remboursement si nécessaire.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<MarkAsReturnedWrapper orderId={dialog.data?.orderId ?? ""}>
						<Button variant="destructive">Marquer comme retourné</Button>
					</MarkAsReturnedWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
