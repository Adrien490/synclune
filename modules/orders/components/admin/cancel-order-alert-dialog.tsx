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
import { CancelOrderWrapper } from "./cancel-order-wrapper";

export const CANCEL_ORDER_DIALOG_ID = "cancel-order";

interface CancelOrderData {
	orderId: string;
	orderNumber: string;
	isPaid: boolean;
	[key: string]: unknown;
}

export function CancelOrderAlertDialog() {
	const cancelDialog = useAlertDialog<CancelOrderData>(CANCEL_ORDER_DIALOG_ID);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			cancelDialog.close();
		}
	};

	return (
		<AlertDialog open={cancelDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmer l'annulation</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Es-tu sûr de vouloir annuler la commande{" "}
								<strong>{cancelDialog.data?.orderNumber}</strong> ?
							</p>
							{cancelDialog.data?.isPaid && (
								<p className="mt-2 text-amber-600">
									Cette commande a été payée. Le statut de paiement sera passé à
									REFUNDED. N'oublie pas de procéder au remboursement via Stripe.
								</p>
							)}
							<p className="text-muted-foreground mt-4 text-sm">
								La commande restera en base de données pour préserver la
								traçabilité comptable (numérotation des factures).
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Fermer</AlertDialogCancel>
					<CancelOrderWrapper orderId={cancelDialog.data?.orderId ?? ""}>
						<Button variant="destructive">Annuler la commande</Button>
					</CancelOrderWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
