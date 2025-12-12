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
import { useDeleteUploadThingFile } from "@/modules/media/lib/uploadthing/use-delete-uploadthing-file";
import { startTransition } from "react";

export const DELETE_GALLERY_MEDIA_DIALOG_ID = "delete-gallery-media";

interface DeleteGalleryMediaData {
	index: number;
	url: string;
	skipUtapiDelete?: boolean;
	onRemove: () => void;
	[key: string]: unknown;
}

export function DeleteGalleryMediaAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteGalleryMediaData>(
		DELETE_GALLERY_MEDIA_DIALOG_ID
	);

	const { isPending, action } = useDeleteUploadThingFile({
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
		const { url, skipUtapiDelete, onRemove } = deleteDialog.data ?? {};

		if (!url) return;

		// Si skipUtapiDelete, on supprime juste localement sans passer par UTAPI
		if (skipUtapiDelete) {
			onRemove?.();
			deleteDialog.close();
			return;
		}

		// Sinon, suppression immédiate via UTAPI
		const formData = new FormData();
		formData.append("fileUrl", url);
		startTransition(() => {
			action(formData);
		});
	};

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
					<AlertDialogDescription>
						{deleteDialog.data?.skipUtapiDelete
							? "Es-tu sûr de vouloir supprimer ce média de la galerie ? Les modifications seront effectives après validation du formulaire."
							: "Es-tu sûr de vouloir supprimer ce média de la galerie ? Cette action est irréversible."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						type="button"
						disabled={isPending}
						className="w-full sm:w-auto"
					>
						Annuler
					</AlertDialogCancel>
					<Button
						type="button"
						onClick={handleDelete}
						disabled={isPending}
						className="w-full sm:w-auto"
					>
						{isPending ? "Suppression..." : "Supprimer"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
