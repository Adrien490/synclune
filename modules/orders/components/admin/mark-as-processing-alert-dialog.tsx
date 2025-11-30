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
import { useMarkAsProcessing } from "@/modules/orders/hooks/use-mark-as-processing";
import { Loader2 } from "lucide-react";

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
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Passage...
								</>
							) : (
								"Passer en préparation"
							)}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
