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
import { useDeleteUploadThingFiles } from "@/modules/media/lib/uploadthing/use-delete-uploadthing-files";
import { startTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { useHaptic } from "@/shared/hooks/use-haptic";

export const DELETE_PRIMARY_IMAGE_DIALOG_ID = "delete-primary-image";

interface DeletePrimaryImageData {
	imageUrl: string;
	skipUtapiDelete?: boolean;
	onRemove: () => void;
	[key: string]: unknown;
}

export function DeletePrimaryImageAlertDialog() {
	const deleteDialog = useAlertDialog<DeletePrimaryImageData>(DELETE_PRIMARY_IMAGE_DIALOG_ID);
	const haptic = useHaptic();

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

		haptic("medium");

		// If skipUtapiDelete, just remove locally without calling UTAPI
		if (skipUtapiDelete) {
			onRemove?.();
			deleteDialog.close();
			return;
		}

		// Otherwise, immediate deletion via UTAPI
		startTransition(() => {
			deleteFiles(imageUrl);
		});
	};

	return (
		<ResponsiveAlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogTitle>Confirmer la suppression</ResponsiveAlertDialogTitle>
					<ResponsiveAlertDialogDescription>
						{deleteDialog.data?.skipUtapiDelete
							? "Êtes-vous sûr de vouloir supprimer ce média principal ? Les modifications seront effectives après validation du formulaire."
							: "Êtes-vous sûr de vouloir supprimer ce média principal ? Cette action est irréversible."}
					</ResponsiveAlertDialogDescription>
				</ResponsiveAlertDialogHeader>
				<ResponsiveAlertDialogFooter>
					<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
					<ResponsiveAlertDialogAction
						type="button"
						onClick={handleDelete}
						disabled={isPending}
						aria-busy={isPending}
					>
						{isPending && <LoaderCircle className="motion-safe:animate-spin" />}
						{isPending ? "Suppression…" : "Supprimer"}
					</ResponsiveAlertDialogAction>
				</ResponsiveAlertDialogFooter>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
