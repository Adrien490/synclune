"use client";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDeleteUploadThingFile } from "@/modules/media/lib/uploadthing/use-delete-uploadthing-file";
import { startTransition } from "react";
import { LoaderCircle } from "lucide-react";
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

		haptic("medium");

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
		<ResponsiveAlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogTitle>Confirmer la suppression</ResponsiveAlertDialogTitle>
					<ResponsiveAlertDialogDescription>
						{deleteDialog.data?.skipUtapiDelete
							? "Veux-tu vraiment supprimer ce média de la galerie ? Les modifications seront effectives après validation du formulaire."
							: "Veux-tu vraiment supprimer ce média de la galerie ? Cette action est irréversible."}
					</ResponsiveAlertDialogDescription>
				</ResponsiveAlertDialogHeader>
				<ResponsiveAlertDialogFooter>
					<ResponsiveAlertDialogCancel disabled={isPending} className="w-full sm:w-auto">
						Annuler
					</ResponsiveAlertDialogCancel>
					<ResponsiveAlertDialogAction
						type="button"
						onClick={handleDelete}
						disabled={isPending}
						aria-busy={isPending}
						className="w-full sm:w-auto"
					>
						{isPending && <LoaderCircle className="motion-safe:animate-spin" />}
						{isPending ? "Suppression…" : "Supprimer"}
					</ResponsiveAlertDialogAction>
				</ResponsiveAlertDialogFooter>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
