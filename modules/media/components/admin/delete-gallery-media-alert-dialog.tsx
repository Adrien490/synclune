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
import { useDeleteUploadThingFile } from "@/modules/media/lib/uploadthing";
import { Loader2, Trash2 } from "lucide-react";
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
					<AlertDialogCancel type="button" disabled={isPending}>
						Annuler
					</AlertDialogCancel>
					<AlertDialogAction
						type="button"
						onClick={(e) => {
							e.preventDefault();
							handleDelete();
						}}
						disabled={isPending}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Suppression...
							</>
						) : (
							<>
								<Trash2 className="mr-2 h-4 w-4" />
								Supprimer
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
