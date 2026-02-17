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

		// If skipUtapiDelete, just remove locally without calling UTAPI
		if (skipUtapiDelete) {
			onRemove?.();
			deleteDialog.close();
			return;
		}

		// Otherwise, immediate deletion via UTAPI
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
							? "Êtes-vous sûr de vouloir supprimer ce média de la galerie ? Les modifications seront effectives après validation du formulaire."
							: "Êtes-vous sûr de vouloir supprimer ce média de la galerie ? Cette action est irréversible."}
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
					<AlertDialogAction
						type="button"
						onClick={handleDelete}
						disabled={isPending}
						className="w-full sm:w-auto"
					>
						{isPending ? "Suppression..." : "Supprimer"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
