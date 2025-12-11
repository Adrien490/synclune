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
import { useMarkAsPaid } from "@/modules/orders/hooks/use-mark-as-paid";

export const MARK_AS_PAID_DIALOG_ID = "mark-as-paid";

interface MarkAsPaidData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsPaidAlertDialog() {
	const dialog = useAlertDialog<MarkAsPaidData>(MARK_AS_PAID_DIALOG_ID);

	const { action, isPending } = useMarkAsPaid({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.orderId ?? ""} />

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
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Marquage..." : "Marquer comme payée"}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
