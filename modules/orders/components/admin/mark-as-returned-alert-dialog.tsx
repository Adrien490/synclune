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
import { useMarkAsReturned } from "@/modules/orders/hooks/use-mark-as-returned";

export const MARK_AS_RETURNED_DIALOG_ID = "mark-as-returned";

interface MarkAsReturnedData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsReturnedAlertDialog() {
	const dialog = useAlertDialog<MarkAsReturnedData>(MARK_AS_RETURNED_DIALOG_ID);

	const { action, isPending } = useMarkAsReturned({
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
						<AlertDialogTitle>Marquer comme retourné</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir marquer la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> comme retournée ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Le statut de livraison passera à "Retourné". Vous pourrez ensuite
									créer un remboursement si nécessaire.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending}>
							{isPending ? "Marquage..." : "Marquer comme retourné"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
