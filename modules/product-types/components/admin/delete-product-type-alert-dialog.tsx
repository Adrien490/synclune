"use client";

import { DeleteConfirmationDialog } from "@/shared/components/dialogs";
import { useDeleteProductType } from "@/modules/product-types/hooks/use-delete-product-type";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const DELETE_PRODUCT_TYPE_DIALOG_ID = "delete-product-type";

interface DeleteProductTypeData {
	productTypeId: string;
	label: string;
	productsCount?: number;
	[key: string]: unknown;
}

export function DeleteProductTypeAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteProductTypeData>(DELETE_PRODUCT_TYPE_DIALOG_ID);

	const { action, isPending } = useDeleteProductType({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	return (
		<DeleteConfirmationDialog<DeleteProductTypeData>
			dialogId={DELETE_PRODUCT_TYPE_DIALOG_ID}
			title="Supprimer ce type de bijou ?"
			action={action}
			isPending={isPending}
			hiddenFields={[{ name: "productTypeId", dataKey: "productTypeId" }]}
			description={(data) => (
				<div className="space-y-3">
					<p>
						Voulez-vous vraiment supprimer le type <strong>&quot;{data?.label}&quot;</strong> ?
					</p>
					{data?.productsCount != null && data.productsCount > 0 && (
						<p className="text-destructive font-medium">
							Impossible : {data.productsCount} produit(s) actif(s) utilise(nt) ce type. Retirez-les
							avant de supprimer.
						</p>
					)}
					<p className="text-muted-foreground text-sm">Cette action est irréversible.</p>
				</div>
			)}
		/>
	);
}
