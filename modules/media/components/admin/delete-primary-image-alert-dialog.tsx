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
import { useDeleteUploadThingFiles } from "@/modules/media/lib/uploadthing";
import { Loader2, Trash2 } from "lucide-react";
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
					<Button
						type="button"
						variant="destructive"
						onClick={handleDelete}
						disabled={isPending}
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
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
