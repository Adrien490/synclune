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
import { useMarkAsProcessing } from "@/modules/orders/hooks/use-mark-as-processing";

export const MARK_AS_PROCESSING_DIALOG_ID = "mark-as-processing";

interface MarkAsProcessingData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsProcessingAlertDialog() {
	const dialog = useAlertDialog<MarkAsProcessingData>(
		MARK_AS_PROCESSING_DIALOG_ID
	);

	const { action, isPending } = useMarkAsProcessing({
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
						<AlertDialogTitle>Passer en préparation</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir passer la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> en préparation ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Le statut passera de "En attente" à "En préparation". Vous pourrez
									ensuite l'expédier une fois le colis prêt.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending}>
							{isPending ? "Passage..." : "Passer en préparation"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
