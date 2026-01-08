"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useRejectRefund } from "@/modules/refunds/hooks/use-reject-refund";
import { ActionStatus } from "@/shared/types/server-action";

export const REJECT_REFUND_DIALOG_ID = "reject-refund";

interface RejectRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function RejectRefundAlertDialog() {
	const dialog = useAlertDialog<RejectRefundData>(REJECT_REFUND_DIALOG_ID);

	const { state, action, isPending } = useRejectRefund({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const formattedAmount = dialog.data?.amount
		? (dialog.data.amount / 100).toFixed(2)
		: "0.00";

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.refundId ?? ""} />

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
					{state?.status && state.status !== ActionStatus.SUCCESS && (
						<p className="text-sm text-destructive mb-4">{state.message}</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending ? "Refus..." : "Refuser"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
