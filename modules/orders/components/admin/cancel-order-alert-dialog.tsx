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
import { useCancelOrder } from "@/modules/orders/hooks/use-cancel-order";
import { Loader2 } from "lucide-react";

export const CANCEL_ORDER_DIALOG_ID = "cancel-order";

interface CancelOrderData {
	orderId: string;
	orderNumber: string;
	isPaid: boolean;
	[key: string]: unknown;
}

export function CancelOrderAlertDialog() {
	const cancelDialog = useAlertDialog<CancelOrderData>(CANCEL_ORDER_DIALOG_ID);

	const { action, isPending } = useCancelOrder({
		onSuccess: () => {
			cancelDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			cancelDialog.close();
		}
	};

	return (
		<AlertDialog open={cancelDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={cancelDialog.data?.orderId ?? ""} />

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
						<AlertDialogCancel type="button" disabled={isPending}>
							Fermer
						</AlertDialogCancel>
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Annulation...
								</>
							) : (
								"Annuler la commande"
							)}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
