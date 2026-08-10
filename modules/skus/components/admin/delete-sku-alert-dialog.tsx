"use client";

import { usePathname } from "next/navigation";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useDeleteProductSku } from "@/modules/skus/hooks/use-delete-sku";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useBackToListOnDelete } from "@/shared/hooks/use-back-to-list-on-delete";

export const DELETE_PRODUCT_SKU_DIALOG_ID = "delete-product-sku";

interface DeleteProductSkuData {
	skuId: string;
	skuName: string;
	/** Vrai si le SKU est le représentant du produit (rang 0 de position). */
	isRepresentative?: boolean;
	[key: string]: unknown;
}

export function DeleteProductSkuAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteProductSkuData>(DELETE_PRODUCT_SKU_DIALOG_ID);
	// Page détail variante = …/variantes/[skuId] ; on retire le segment skuId pour
	// retrouver la liste des variantes. Sur la liste (…/variantes) le regex ne
	// matche pas → href === pathname → le helper no-ope.
	const pathname = usePathname();
	const variantesListHref = pathname.replace(/\/variantes\/[^/]+$/, "/variantes");
	const backToList = useBackToListOnDelete(variantesListHref);

	const { action } = useDeleteProductSku({ onSuccess: backToList });

	const data = deleteDialog.data;

	return (
		<ConfirmDialog
			open={deleteDialog.isOpen}
			onClose={deleteDialog.close}
			action={action}
			tone="destructive"
			fields={{ skuId: data?.skuId }}
			title="Confirmer la suppression"
			confirmLabel="Supprimer"
			descriptionClassName="space-y-3"
			description={
				data?.isRepresentative ? (
					<>
						<p>
							<strong className="text-destructive">
								Attention : Cette variante est la variante principale du produit.
							</strong>
						</p>
						<p>
							Êtes-vous sûr de vouloir supprimer la variante <strong>{data.skuName}</strong> ?
						</p>
						{/* Plus de transfert manuel : le représentant est le rang 0 de
						    (position asc, id asc), la variante suivante prend le relais. */}
						<p>La variante suivante deviendra automatiquement la variante principale.</p>
					</>
				) : (
					<>
						<p>
							Êtes-vous sûr de vouloir supprimer la variante <strong>{data?.skuName}</strong> ?
						</p>
						<p>
							Cette action est irréversible et supprimera également toutes les images associées à
							cette variante.
						</p>
					</>
				)
			}
		/>
	);
}
