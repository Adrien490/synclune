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
import { useDeleteUploadThingFiles } from "@/modules/media/lib/uploadthing/use-delete-uploadthing-files";
import { startTransition } from "react";

export const DELETE_PRIMARY_IMAGE_DIALOG_ID = "delete-primary-image";

interface DeletePrimaryImageData {
	imageUrl: string;
	skipUtapiDelete?: boolean;
	onRemove: () => void;
	[key: string]: unknown;
}

export function DeletePrimaryImageAlertDialog() {
	const deleteDialog = useAlertDialog<DeletePrimaryImageData>(
		DELETE_PRIMARY_IMAGE_DIALOG_ID
	);

	const { isPending, deleteFiles } = useDeleteUploadThingFiles({
		onSuccess: () => {
			deleteDialog.data?.onRemove();
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	const handleDelete = () => {
		const { imageUrl, skipUtapiDelete, onRemove } = deleteDialog.data ?? {};

		if (!imageUrl) return;

		// Si skipUtapiDelete, on supprime juste localement sans passer par UTAPI
		if (skipUtapiDelete) {
			onRemove?.();
			deleteDialog.close();
			return;
		}

		// Sinon, suppression immédiate via UTAPI
		startTransition(() => {
			deleteFiles(imageUrl);
		});
	};

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
					<AlertDialogDescription>
						{deleteDialog.data?.skipUtapiDelete
							? "Es-tu sûr de vouloir supprimer ce média principal ? Les modifications seront effectives après validation du formulaire."
							: "Es-tu sûr de vouloir supprimer ce média principal ? Cette action est irréversible."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button" disabled={isPending}>
						Annuler
					</AlertDialogCancel>
					<AlertDialogAction
						type="button"
						onClick={handleDelete}
						disabled={isPending}
					>
						{isPending ? "Suppression..." : "Supprimer"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
