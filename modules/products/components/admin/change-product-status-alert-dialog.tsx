"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useToggleProductStatus } from "@/modules/products/hooks/use-toggle-product-status";

export const CHANGE_PRODUCT_STATUS_DIALOG_ID = "change-product-status";

interface ChangeProductStatusData {
	productId: string;
	productTitle: string;
	targetActive: boolean;
	[key: string]: unknown;
}

/**
 * Schéma lean (lot 2) : le statut produit est le booléen `active`
 * (en vente / brouillon) — plus d'état « archivé ».
 */
export function ChangeProductStatusAlertDialog() {
	const dialog = useAlertDialog<ChangeProductStatusData>(CHANGE_PRODUCT_STATUS_DIALOG_ID);

	const { action } = useToggleProductStatus();

	const targetActive = dialog.data?.targetActive ?? true;

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone={targetActive ? "success" : "neutral"}
			fields={{
				productId: dialog.data?.productId,
				targetActive: String(targetActive),
			}}
			title={targetActive ? "Mettre en vente ?" : "Repasser en brouillon ?"}
			confirmLabel={targetActive ? "Mettre en vente" : "Mettre en brouillon"}
			descriptionClassName="space-y-4"
			description={
				<>
					<div>
						Tu es sur le point de {targetActive ? "publier" : "dépublier"}{" "}
						<strong>&quot;{dialog.data?.productTitle}&quot;</strong>.
					</div>

					<div className="bg-muted rounded-md p-3">
						<div className="text-sm">
							{targetActive
								? "Le bijou sera visible et achetable par tous les visiteurs de la boutique."
								: "Le bijou ne sera plus visible sur la boutique mais restera accessible dans le dashboard."}
						</div>
					</div>
				</>
			}
		/>
	);
}
