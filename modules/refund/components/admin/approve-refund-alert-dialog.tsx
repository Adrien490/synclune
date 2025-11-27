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
import { ApproveRefundWrapper } from "./approve-refund-wrapper";

export const APPROVE_REFUND_DIALOG_ID = "approve-refund";

interface ApproveRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function ApproveRefundAlertDialog() {
	const dialog = useAlertDialog<ApproveRefundData>(APPROVE_REFUND_DIALOG_ID);

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
					<AlertDialogTitle>Approuver le remboursement</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Approuver le remboursement de <strong>{formattedAmount} €</strong>{" "}
								pour la commande <strong>{dialog.data?.orderNumber}</strong> ?
							</p>
							<p className="text-muted-foreground mt-4 text-sm">
								Après approbation, vous pourrez procéder au remboursement effectif
								via Stripe.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<ApproveRefundWrapper refundId={dialog.data?.refundId ?? ""}>
						<Button>Approuver</Button>
					</ApproveRefundWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
