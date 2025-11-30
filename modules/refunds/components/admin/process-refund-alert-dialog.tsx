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
import { ProcessRefundWrapper } from "./process-refund-wrapper";

export const PROCESS_REFUND_DIALOG_ID = "process-refund";

interface ProcessRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function ProcessRefundAlertDialog() {
	const dialog = useAlertDialog<ProcessRefundData>(PROCESS_REFUND_DIALOG_ID);

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
					<AlertDialogTitle>Traiter le remboursement</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Procéder au remboursement de <strong>{formattedAmount} €</strong>{" "}
								pour la commande <strong>{dialog.data?.orderNumber}</strong> ?
							</p>
							<p className="text-amber-600 mt-4 text-sm">
								Cette action va effectuer le remboursement via Stripe. Le montant
								sera crédité sur le moyen de paiement du client sous 5-10 jours
								ouvrés.
							</p>
							<p className="text-muted-foreground mt-2 text-sm">
								Le stock sera automatiquement restauré pour les articles marqués
								"à restocker".
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<ProcessRefundWrapper refundId={dialog.data?.refundId ?? ""}>
						<Button variant="default">Traiter le remboursement</Button>
					</ProcessRefundWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
