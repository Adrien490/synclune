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
import { CancelRefundWrapper } from "./cancel-refund-wrapper";

export const CANCEL_REFUND_DIALOG_ID = "cancel-refund";

interface CancelRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function CancelRefundAlertDialog() {
	const dialog = useAlertDialog<CancelRefundData>(CANCEL_REFUND_DIALOG_ID);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			dialog.close();
		}
	};

	const formattedAmount = dialog.data?.amount
		? (dialog.data.amount / 100).toFixed(2)
		: "0.00";

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Annuler la demande de remboursement</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Annuler la demande de remboursement de{" "}
								<strong>{formattedAmount} €</strong> pour la commande{" "}
								<strong>{dialog.data?.orderNumber}</strong> ?
							</p>
							<p className="text-muted-foreground mt-4 text-sm">
								La demande sera supprimée. Vous pourrez en créer une nouvelle si
								nécessaire.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Fermer</AlertDialogCancel>
					<CancelRefundWrapper refundId={dialog.data?.refundId ?? ""}>
						<Button variant="destructive">Annuler la demande</Button>
					</CancelRefundWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
