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
import { useDeleteMaterial } from "@/modules/materials/hooks/use-delete-material";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const DELETE_MATERIAL_DIALOG_ID = "delete-material";

interface DeleteMaterialData {
	materialId: string;
	materialName: string;
	[key: string]: unknown;
}

export function DeleteMaterialAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteMaterialData>(DELETE_MATERIAL_DIALOG_ID);
	const { action, isPending } = useDeleteMaterial({
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
						value={deleteDialog.data?.materialId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription>
							Êtes-vous sûr de vouloir supprimer le matériau{" "}
							<strong>&quot;{deleteDialog.data?.materialName}&quot;</strong> ?
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
							{isPending ? "Suppression..." : "Supprimer"}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
