"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useUpdateOrderStatus } from "@/modules/orders/hooks/use-update-order-status";

export const UNDO_RETURN_DIALOG_ID = "undo-return";

interface UndoReturnData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

/**
 * Annulation d'un retour saisi par erreur — sortie de l'état RETURNED,
 * jusqu'ici absorbant (audit « Livraison et tracking » 2026-08-01).
 */
export function UndoReturnAlertDialog() {
	const dialog = useAlertDialog<UndoReturnData>(UNDO_RETURN_DIALOG_ID);
	const { action } = useUpdateOrderStatus("undo-return");

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone="warning"
			fields={{ id: dialog.data?.orderId }}
			title="Annuler le retour"
			confirmLabel="Annuler le retour"
			description={
				<>
					<p>
						Annuler le retour de la commande <strong>{dialog.data?.orderNumber}</strong> ?
					</p>
					<p className="text-muted-foreground mt-4 text-sm">
						Le statut de livraison repassera à &quot;Livré&quot;. Un remboursement déjà créé
						n&apos;est pas affecté.
					</p>
				</>
			}
		/>
	);
}
