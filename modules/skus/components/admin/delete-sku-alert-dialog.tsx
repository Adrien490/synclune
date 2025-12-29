"use client";

import { DeleteConfirmationDialog } from "@/shared/components/dialogs";
import { useDeleteProductSku } from "@/modules/skus/hooks/use-delete-sku";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const DELETE_PRODUCT_SKU_DIALOG_ID = "delete-product-sku";

interface DeleteProductSkuData {
	skuId: string;
	skuName: string;
	isDefault?: boolean;
	[key: string]: unknown;
}

export function DeleteProductSkuAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteProductSkuData>(
		DELETE_PRODUCT_SKU_DIALOG_ID
	);

	const { action, isPending } = useDeleteProductSku({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	return (
		<DeleteConfirmationDialog<DeleteProductSkuData>
			dialogId={DELETE_PRODUCT_SKU_DIALOG_ID}
			action={action}
			isPending={isPending}
			hiddenFields={[{ name: "skuId", dataKey: "skuId" }]}
			description={(data) =>
				data?.isDefault ? (
					<>
						<strong className="text-destructive">
							Attention : Cette variante est la variante principale du
							produit.
						</strong>
						<br />
						<br />
						Es-tu sûr de vouloir supprimer la variante{" "}
						<strong>{data?.skuName}</strong> ?<br />
						<br />
						Tu devras définir une nouvelle variante principale après cette
						suppression.
					</>
				) : (
					<>
						Es-tu sûr de vouloir supprimer la variante{" "}
						<strong>{data?.skuName}</strong> ?
						<br />
						<br />
						Cette action est irréversible et supprimera également toutes
						les images associées à cette variante.
					</>
				)
			}
		/>
	);
}
