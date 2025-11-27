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
import { MarkAsPaidWrapper } from "./mark-as-paid-wrapper";

export const MARK_AS_PAID_DIALOG_ID = "mark-as-paid";

interface MarkAsPaidData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsPaidAlertDialog() {
	const dialog = useAlertDialog<MarkAsPaidData>(MARK_AS_PAID_DIALOG_ID);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			dialog.close();
		}
	};

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmer le paiement manuel</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Es-tu sûr de vouloir marquer la commande{" "}
								<strong>{dialog.data?.orderNumber}</strong> comme payée ?
							</p>
							<p className="text-muted-foreground mt-4 text-sm">
								Cette action est utilisée pour les paiements par virement ou
								chèque. La commande passera en statut "En préparation".
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<MarkAsPaidWrapper orderId={dialog.data?.orderId ?? ""}>
						<Button>Marquer comme payée</Button>
					</MarkAsPaidWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
