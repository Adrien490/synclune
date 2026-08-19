"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useDeleteCollection } from "@/modules/collections/hooks/use-delete-collection";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useBackToListOnDelete } from "@/shared/hooks/use-back-to-list-on-delete";

export const DELETE_COLLECTION_DIALOG_ID = "delete-collection";

interface DeleteCollectionData {
	collectionId: string;
	collectionName: string;
	productsCount: number;
	[key: string]: unknown;
}

export function DeleteCollectionAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteCollectionData>(DELETE_COLLECTION_DIALOG_ID);
	const backToList = useBackToListOnDelete("/admin/catalogue/collections");

	const { action } = useDeleteCollection({ onSuccess: backToList });

	const productsCount = deleteDialog.data?.productsCount ?? 0;

	return (
		<ConfirmDialog
			open={deleteDialog.isOpen}
			onClose={deleteDialog.close}
			action={action}
			tone="neutral"
			fields={{ id: deleteDialog.data?.collectionId }}
			title="Confirmer la suppression"
			confirmLabel="Supprimer"
			descriptionClassName="space-y-3"
			description={
				<>
					<p>
						Veux-tu vraiment supprimer la collection{" "}
						<strong>&quot;{deleteDialog.data?.collectionName}&quot;</strong> ?
					</p>
					{productsCount > 0 ? (
						<>
							<p className="text-warning font-medium">
								Cette collection contient {productsCount} produit
								{productsCount > 1 ? "s" : ""}.
							</p>
							<p>
								Les produits seront préservés mais n&apos;appartiendront plus à aucune collection.
							</p>
						</>
					) : null}
					<p className="text-destructive font-medium">Cette action est irréversible.</p>
				</>
			}
		/>
	);
}
