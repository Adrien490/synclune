"use client";

import { DeleteConfirmationDialog } from "@/shared/components/dialogs";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDeleteProduct } from "@/modules/products/hooks/use-delete-product";

export const DELETE_PRODUCT_DIALOG_ID = "delete-product";

interface DeleteProductData {
	productId: string;
	productTitle: string;
	[key: string]: unknown;
}

export function DeleteProductAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteProductData>(
		DELETE_PRODUCT_DIALOG_ID
	);

	const { action, isPending } = useDeleteProduct({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	return (
		<DeleteConfirmationDialog<DeleteProductData>
			dialogId={DELETE_PRODUCT_DIALOG_ID}
			action={action}
			isPending={isPending}
			hiddenFields={[{ name: "id", dataKey: "productId" }]}
			description={(data) => (
				<div className="space-y-3">
					<p>
						Êtes-vous sûr de vouloir supprimer le bijou{" "}
						<strong>&quot;{data?.productTitle}&quot;</strong> ?
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
						du bijou via des snapshots.
					</p>
				</div>
			)}
		/>
	);
}
