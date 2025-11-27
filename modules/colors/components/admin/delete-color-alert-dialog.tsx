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
import { DeleteColorButton } from "@/modules/colors/components/admin/delete-color-button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const DELETE_COLOR_DIALOG_ID = "delete-color";

interface DeleteColorData {
	colorId: string;
	colorName: string;
	[key: string]: unknown;
}

export function DeleteColorAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteColorData>(DELETE_COLOR_DIALOG_ID);

	return (
		<AlertDialog
			open={deleteDialog.isOpen}
			onOpenChange={(open) => (open ? deleteDialog.open() : deleteDialog.close())}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
					<AlertDialogDescription>
						Êtes-vous sûr de vouloir supprimer la couleur{" "}
						<strong>&quot;{deleteDialog.data?.colorName}&quot;</strong> ?
						<br />
						<br />
						<span className="text-destructive font-medium">
							Cette action est irréversible.
						</span>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<DeleteColorButton colorId={deleteDialog.data?.colorId ?? ""}>
						<Button
							variant="destructive"
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Supprimer
						</Button>
					</DeleteColorButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
