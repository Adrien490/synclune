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
	const deleteDialog = useAlertDialog<DeleteProductTypeData>(
		DELETE_PRODUCT_TYPE_DIALOG_ID
	);

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
				<>
					Voulez-vous vraiment supprimer le type{" "}
					<strong>&quot;{data?.label}&quot;</strong> ?
					<br />
					<br />
					{data?.productsCount && data.productsCount > 0 && (
						<>
							<span className="text-orange-600 dark:text-orange-400 font-medium">
								Attention : {data.productsCount} bijou(x) utilise(nt) ce type.
								Ils seront dissociés de ce type.
							</span>
							<br />
							<br />
						</>
					)}
					<span className="text-muted-foreground text-sm">
						Cette action est irréversible.
					</span>
				</>
			)}
		/>
	);
}
