"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useSetFeaturedProduct } from "../../hooks/use-set-featured-product";

export const SET_FEATURED_PRODUCT_DIALOG_ID = "set-featured-product";

interface SetFeaturedProductData {
	collectionId: string;
	collectionSlug: string;
	productId: string;
	productTitle: string;
	[key: string]: unknown;
}

/**
 * La vedette est le rang 0 de l'ordre des associations (audit schéma V5, lot
 * A3) : il y a toujours une vedette, on ne peut que la REMPLACER — l'ancien
 * flux « retirer la vedette » est parti avec le booléen `isFeatured`.
 */
export function SetFeaturedProductAlertDialog() {
	const dialog = useAlertDialog<SetFeaturedProductData>(SET_FEATURED_PRODUCT_DIALOG_ID);
	const { setFeatured } = useSetFeaturedProduct();

	const handleConfirm = () => {
		if (!dialog.data) return;

		setFeatured(dialog.data.collectionId, dialog.data.productId);
	};

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			onConfirm={handleConfirm}
			tone="info"
			title="Definir le produit vedette"
			confirmLabel="Definir comme vedette"
			descriptionClassName="space-y-3"
			description={
				<>
					<p>
						Voulez-vous definir <strong>&quot;{dialog.data?.productTitle}&quot;</strong> comme
						produit vedette de cette collection ?
					</p>
					<p>
						Ce produit sera utilise comme image representative de la collection sur la page
						d&apos;accueil et dans les listes.
					</p>
				</>
			}
		/>
	);
}
