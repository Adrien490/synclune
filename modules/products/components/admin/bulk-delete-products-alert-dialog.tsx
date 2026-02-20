"use client";

import { BulkDeleteDialog } from "@/shared/components/dialogs";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkDeleteProducts } from "@/modules/products/hooks/use-bulk-delete-products";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const BULK_DELETE_PRODUCTS_DIALOG_ID = "bulk-delete-products";

export function BulkDeleteProductsAlertDialog() {
	const dialog = useAlertDialog(BULK_DELETE_PRODUCTS_DIALOG_ID);
	const { clearSelection } = useSelectionContext();

	const { action, isPending } = useBulkDeleteProducts({
		onSuccess: () => {
			clearSelection();
			dialog.close();
		},
	});

	return (
		<BulkDeleteDialog
			dialogId={BULK_DELETE_PRODUCTS_DIALOG_ID}
			action={action}
			isPending={isPending}
			idsFieldName="productIds"
			idsDataKey="productIds"
			description={(count) => (
				<div className="space-y-3">
					<p>
						Êtes-vous sûr de vouloir supprimer{" "}
						<strong>
							{count} produit{count > 1 ? "s" : ""}
						</strong>{" "}
						?
					</p>
					<p>
						<span className="text-destructive font-medium">
							Cette action est irréversible
						</span>{" "}
						et supprimera également toutes les variantes et images
						associées.
					</p>
					<p className="text-muted-foreground text-xs">
						Note: Les commandes existantes conserveront les informations
						des produits via des snapshots.
					</p>
				</div>
			)}
		/>
	);
}
