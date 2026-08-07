"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useUpdateOrderStatus } from "@/modules/orders/hooks/use-update-order-status";

export const MARK_AS_DELIVERED_DIALOG_ID = "mark-as-delivered";

interface MarkAsDeliveredData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsDeliveredAlertDialog() {
	const dialog = useAlertDialog<MarkAsDeliveredData>(MARK_AS_DELIVERED_DIALOG_ID);
	const { action } = useUpdateOrderStatus("delivered");

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone="success"
			fields={{ id: dialog.data?.orderId }}
			title="Confirmer la livraison"
			confirmLabel="Marquer comme livrée"
			description={
				<>
					<p>
						Êtes-vous sûr de vouloir marquer la commande <strong>{dialog.data?.orderNumber}</strong>{" "}
						comme livrée ?
					</p>
					<p className="text-muted-foreground mt-4 text-sm">
						Cette action force le statut si le webhook du transporteur ne fonctionne pas. La date de
						livraison sera enregistrée.
					</p>
				</>
			}
		/>
	);
}
