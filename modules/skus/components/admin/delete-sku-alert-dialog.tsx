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
					<div className="space-y-3">
						<p>
							<strong className="text-destructive">
								Attention : Cette variante est la variante principale du
								produit.
							</strong>
						</p>
						<p>
							Êtes-vous sûr de vouloir supprimer la variante{" "}
							<strong>{data?.skuName}</strong> ?
						</p>
						<p>
							Vous devrez définir une nouvelle variante principale après
							cette suppression.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						<p>
							Êtes-vous sûr de vouloir supprimer la variante{" "}
							<strong>{data?.skuName}</strong> ?
						</p>
						<p>
							Cette action est irréversible et supprimera également
							toutes les images associées à cette variante.
						</p>
					</div>
				)
			}
		/>
	);
}
