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
import { RejectRefundWrapper } from "./reject-refund-wrapper";

export const REJECT_REFUND_DIALOG_ID = "reject-refund";

interface RejectRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function RejectRefundAlertDialog() {
	const dialog = useAlertDialog<RejectRefundData>(REJECT_REFUND_DIALOG_ID);

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
					<AlertDialogTitle>Refuser le remboursement</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Refuser la demande de remboursement de{" "}
								<strong>{formattedAmount} €</strong> pour la commande{" "}
								<strong>{dialog.data?.orderNumber}</strong> ?
							</p>
							<p className="text-muted-foreground mt-4 text-sm">
								Cette action est définitive. La demande sera marquée comme
								refusée.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<RejectRefundWrapper refundId={dialog.data?.refundId ?? ""}>
						<Button variant="destructive">Refuser</Button>
					</RejectRefundWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
