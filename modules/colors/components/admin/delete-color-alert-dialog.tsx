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
import { useDeleteColor } from "@/modules/colors/hooks/use-delete-color";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { ActionStatus } from "@/shared/types/server-action";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export const DELETE_COLOR_DIALOG_ID = "delete-color";

interface DeleteColorData {
	colorId: string;
	colorName: string;
	[key: string]: unknown;
}

export function DeleteColorAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteColorData>(DELETE_COLOR_DIALOG_ID);
	const { state, action, isPending } = useDeleteColor();

	// Fermer le dialog après une suppression réussie
	useEffect(() => {
		if (state?.status === ActionStatus.SUCCESS) {
			deleteDialog.close();
		}
	}, [state, deleteDialog]);

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="id"
						value={deleteDialog.data?.colorId ?? ""}
					/>

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
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Suppression...
								</>
							) : (
								"Supprimer"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
