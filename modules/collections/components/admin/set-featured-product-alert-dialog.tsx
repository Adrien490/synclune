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
	isFeatured: boolean;
	[key: string]: unknown;
}

export function SetFeaturedProductAlertDialog() {
	const dialog = useAlertDialog<SetFeaturedProductData>(SET_FEATURED_PRODUCT_DIALOG_ID);
	const { setFeatured, removeFeatured } = useSetFeaturedProduct();

	const handleConfirm = () => {
		if (!dialog.data) return;

		if (dialog.data.isFeatured) {
			removeFeatured(dialog.data.collectionId, dialog.data.productId);
		} else {
			setFeatured(dialog.data.collectionId, dialog.data.productId);
		}
	};

	const isFeatured = dialog.data?.isFeatured ?? false;

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			onConfirm={handleConfirm}
			tone={isFeatured ? "warning" : "info"}
			title={isFeatured ? "Retirer le produit vedette" : "Definir le produit vedette"}
			confirmLabel={isFeatured ? "Retirer" : "Definir comme vedette"}
			descriptionClassName="space-y-3"
			description={
				isFeatured ? (
					<>
						<p>
							Voulez-vous retirer le statut vedette de{" "}
							<strong>&quot;{dialog.data?.productTitle}&quot;</strong> ?
						</p>
						<p>
							La collection n&apos;aura plus de produit vedette et affichera le produit le plus
							recent comme image representative.
						</p>
					</>
				) : (
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
				)
			}
		/>
	);
}
