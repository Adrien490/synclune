"use client";

import { usePathname } from "next/navigation";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useDeleteProductVariant } from "@/modules/variants/hooks/use-delete-variant";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useBackToListOnDelete } from "@/shared/hooks/use-back-to-list-on-delete";

export const DELETE_PRODUCT_VARIANT_DIALOG_ID = "delete-product-variant";

interface DeleteProductVariantData {
	variantId: string;
	variantName: string;
	/** Vrai si le VARIANT est le représentant du produit (rang 0 de position). */
	isRepresentative?: boolean;
	[key: string]: unknown;
}

export function DeleteProductVariantAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteProductVariantData>(DELETE_PRODUCT_VARIANT_DIALOG_ID);
	// Page détail variante = …/variantes/[variantId] ; on retire le segment variantId pour
	// retrouver la liste des variantes. Sur la liste (…/variantes) le regex ne
	// matche pas → href === pathname → le helper no-ope.
	const pathname = usePathname();
	const variantesListHref = pathname.replace(/\/variantes\/[^/]+$/, "/variantes");
	const backToList = useBackToListOnDelete(variantesListHref);

	const { action } = useDeleteProductVariant({ onSuccess: backToList });

	const data = deleteDialog.data;

	return (
		<ConfirmDialog
			open={deleteDialog.isOpen}
			onClose={deleteDialog.close}
			action={action}
			tone="destructive"
			fields={{ variantId: data?.variantId }}
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
							Êtes-vous sûr de vouloir supprimer la variante <strong>{data.variantName}</strong> ?
						</p>
						{/* Plus de transfert manuel : le représentant est le rang 0 de
						    (position asc, id asc), la variante suivante prend le relais. */}
						<p>La variante suivante deviendra automatiquement la variante principale.</p>
					</>
				) : (
					<>
						<p>
							Êtes-vous sûr de vouloir supprimer la variante <strong>{data?.variantName}</strong> ?
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
