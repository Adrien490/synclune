"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useUpdateOrderStatus } from "@/modules/orders/hooks/use-update-order-status";

export const MARK_AS_PROCESSING_DIALOG_ID = "mark-as-processing";

interface MarkAsProcessingData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsProcessingAlertDialog() {
	const dialog = useAlertDialog<MarkAsProcessingData>(MARK_AS_PROCESSING_DIALOG_ID);
	const { action } = useUpdateOrderStatus("processing");

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone="info"
			fields={{ id: dialog.data?.orderId }}
			title="Passer en préparation"
			confirmLabel="Passer en préparation"
			description={
				<>
					<p>
						Êtes-vous sûr de vouloir passer la commande <strong>{dialog.data?.orderNumber}</strong>{" "}
						en préparation ?
					</p>
					<p className="text-muted-foreground mt-4 text-sm">
						Le statut passera de "En attente" à "En préparation". Vous pourrez ensuite l'expédier
						une fois le colis prêt.
					</p>
				</>
			}
		/>
	);
}
