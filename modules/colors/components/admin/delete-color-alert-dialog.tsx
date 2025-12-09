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
import { useDeleteColor } from "@/modules/colors/hooks/use-delete-color";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Loader2 } from "lucide-react";

export const DELETE_COLOR_DIALOG_ID = "delete-color";

interface DeleteColorData {
	colorId: string;
	colorName: string;
	[key: string]: unknown;
}

export function DeleteColorAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteColorData>(DELETE_COLOR_DIALOG_ID);
	const { action, isPending } = useDeleteColor({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

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
							Es-tu sûr(e) de vouloir supprimer la couleur{" "}
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
						<Button
							type="submit"
							disabled={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Suppression...
								</>
							) : (
								"Supprimer"
							)}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
