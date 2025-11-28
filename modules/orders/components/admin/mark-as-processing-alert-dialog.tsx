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
import { MarkAsProcessingWrapper } from "./mark-as-processing-wrapper";

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

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			dialog.close();
		}
	};

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Passer en préparation</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p>
								Es-tu sûr de vouloir passer la commande{" "}
								<strong>{dialog.data?.orderNumber}</strong> en préparation ?
							</p>
							<p className="text-muted-foreground mt-4 text-sm">
								Le statut passera de "En attente" à "En préparation". Tu pourras
								ensuite l'expédier une fois le colis prêt.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<MarkAsProcessingWrapper orderId={dialog.data?.orderId ?? ""}>
						<Button>Passer en préparation</Button>
					</MarkAsProcessingWrapper>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
