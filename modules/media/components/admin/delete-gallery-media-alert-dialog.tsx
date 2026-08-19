"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";

export const DELETE_GALLERY_MEDIA_DIALOG_ID = "delete-gallery-media";

interface DeleteGalleryMediaData {
	index: number;
	url: string;
	onRemove: () => void;
	[key: string]: unknown;
}

/**
 * La confirmation ne retire le média QUE du formulaire — la suppression
 * UploadThing est DIFFÉRÉE au submit (`deletedImageUrls` → l'action serveur,
 * qui passe par la garde de références partagées).
 *
 * L'ancien mode « suppression immédiate » détruisait le blob AVANT la
 * validation du formulaire : annuler ensuite laissait la ligne `ProductMedia`
 * pointer un fichier mort (404 sur son propre produit), et un blob partagé
 * par duplication cassait l'original. Il ouvrait aussi une race : `onSuccess`
 * relisait le store à la résolution de l'action, et ouvrir le dialog d'une
 * autre tuile entre-temps faisait retirer LA MAUVAISE tuile.
 */
export function DeleteGalleryMediaAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteGalleryMediaData>(DELETE_GALLERY_MEDIA_DIALOG_ID);
	const haptic = useHaptic();

	const handleDelete = () => {
		// Capture SYNCHRONE au moment du confirm — jamais de relecture du store
		// après un await (cf. la race documentée ci-dessus).
		const { onRemove } = deleteDialog.data ?? {};
		if (!onRemove) return;

		haptic("medium");
		onRemove();
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
			description="Veux-tu vraiment supprimer ce média de la galerie ? Les modifications seront effectives après validation du formulaire."
		/>
	);
}
