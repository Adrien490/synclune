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
import { useProcessRefund } from "@/modules/refunds/hooks/use-process-refund";
import { ActionStatus } from "@/shared/types/server-action";
import { Loader2 } from "lucide-react";

export const PROCESS_REFUND_DIALOG_ID = "process-refund";

interface ProcessRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function ProcessRefundAlertDialog() {
	const dialog = useAlertDialog<ProcessRefundData>(PROCESS_REFUND_DIALOG_ID);

	const { state, action, isPending } = useProcessRefund({
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
					{state?.status && state.status !== ActionStatus.SUCCESS && (
						<p className="text-sm text-destructive mb-4">{state.message}</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Traitement...
								</>
							) : (
								"Traiter le remboursement"
							)}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
