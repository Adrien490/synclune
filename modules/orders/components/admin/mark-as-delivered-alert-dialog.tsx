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
import { useMarkAsDelivered } from "@/modules/orders/hooks/use-mark-as-delivered";

export const MARK_AS_DELIVERED_DIALOG_ID = "mark-as-delivered";

interface MarkAsDeliveredData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsDeliveredAlertDialog() {
	const dialog = useAlertDialog<MarkAsDeliveredData>(MARK_AS_DELIVERED_DIALOG_ID);

	const { action, isPending } = useMarkAsDelivered({
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
						<AlertDialogTitle>Confirmer la livraison</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								<p>
									Es-tu sûr de vouloir marquer la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> comme livrée ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Cette action force le statut si le webhook du transporteur ne
									fonctionne pas. La date de livraison sera enregistrée.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Mise à jour..." : "Marquer comme livrée"}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
