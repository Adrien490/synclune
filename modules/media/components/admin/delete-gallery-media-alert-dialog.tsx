"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useDeleteUploadThingFile } from "@/modules/media/lib/uploadthing/use-delete-uploadthing-file";
import { startTransition } from "react";
import { useHaptic } from "@/shared/hooks/use-haptic";

export const DELETE_GALLERY_MEDIA_DIALOG_ID = "delete-gallery-media";

interface DeleteGalleryMediaData {
	index: number;
	url: string;
	skipUtapiDelete?: boolean;
	onRemove: () => void;
	[key: string]: unknown;
}

export function DeleteGalleryMediaAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteGalleryMediaData>(DELETE_GALLERY_MEDIA_DIALOG_ID);
	const haptic = useHaptic();

	const { action } = useDeleteUploadThingFile({
		onSuccess: () => {
			deleteDialog.data?.onRemove();
		},
	});

	const handleDelete = () => {
		const { url, skipUtapiDelete, onRemove } = deleteDialog.data ?? {};

		if (!url) return;

		haptic("medium");

		// If skipUtapiDelete, just remove locally without calling UTAPI
		if (skipUtapiDelete) {
			onRemove?.();
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
		<ConfirmDialog
			open={deleteDialog.isOpen}
			onClose={deleteDialog.close}
			onConfirm={handleDelete}
			tone="neutral"
			title="Confirmer la suppression"
			confirmLabel="Supprimer"
			cancelClassName="w-full sm:w-auto"
			confirmClassName="w-full sm:w-auto"
			description={
				deleteDialog.data?.skipUtapiDelete
					? "Veux-tu vraiment supprimer ce média de la galerie ? Les modifications seront effectives après validation du formulaire."
					: "Veux-tu vraiment supprimer ce média de la galerie ? Cette action est irréversible."
			}
		/>
	);
}
