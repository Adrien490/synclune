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

import { DISCARD_ADDRESS_CHANGES_DIALOG_ID } from "../constants/dialog.constants";

interface DiscardAddressChangesData {
	onConfirm: () => void;
	[key: string]: unknown;
}

export function DiscardAddressChangesAlertDialog() {
	const discardDialog = useAlertDialog<DiscardAddressChangesData>(
		DISCARD_ADDRESS_CHANGES_DIALOG_ID,
	);

	const handleConfirm = () => {
		discardDialog.data?.onConfirm();
		discardDialog.close();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			discardDialog.close();
		}
	};

	return (
		<AlertDialog open={discardDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
					<AlertDialogDescription>
						Vous avez des modifications non sauvegardees. Voulez-vous vraiment fermer sans
						enregistrer ?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Continuer l'edition</AlertDialogCancel>
					<AlertDialogAction type="button" onClick={handleConfirm}>
						Abandonner
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
