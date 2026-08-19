"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useBackToListOnDelete } from "@/shared/hooks/use-back-to-list-on-delete";
import { useDeleteProduct } from "@/modules/products/hooks/use-delete-product";

export const DELETE_PRODUCT_DIALOG_ID = "delete-product";

interface DeleteProductData {
	productId: string;
	productTitle: string;
	[key: string]: unknown;
}

export function DeleteProductAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteProductData>(DELETE_PRODUCT_DIALOG_ID);
	const backToList = useBackToListOnDelete("/admin/catalogue/produits");

	const { action } = useDeleteProduct({ onSuccess: backToList });

	return (
		<ConfirmDialog
			open={deleteDialog.isOpen}
			onClose={deleteDialog.close}
			action={action}
			tone="destructive"
			fields={{ productId: deleteDialog.data?.productId }}
			title="Confirmer la suppression"
			confirmLabel="Supprimer"
			descriptionClassName="space-y-3"
			description={
				<>
					<p>
						Veux-tu vraiment supprimer le bijou{" "}
						<strong>&quot;{deleteDialog.data?.productTitle}&quot;</strong> ?
					</p>
					<p>
						<span className="text-destructive font-medium">Cette action est irréversible</span> et
						supprimera également toutes les variantes et images associées.
					</p>
					<p className="text-muted-foreground text-xs">
						Note: Les commandes existantes conserveront les informations du bijou via des snapshots.
					</p>
				</>
			}
		/>
	);
}
