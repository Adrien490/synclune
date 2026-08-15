"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { cancelOrder } from "../../actions/cancel-order";
import { CANCEL_ORDER_DIALOG_ID } from "../../constants/order.constants";
import type { OrderActionsData } from "../../hooks/use-order-actions";

/** « Annuler » une commande PENDING : session Stripe fermée + stock restitué. */
export function CancelOrderAlertDialog() {
	const dialog = useAlertDialog<OrderActionsData>(CANCEL_ORDER_DIALOG_ID);
	const { action } = useActionWithToast(cancelOrder);

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone="destructive"
			fields={{ orderId: dialog.data?.orderId }}
			title="Annuler cette commande ?"
			confirmLabel="Annuler la commande"
			descriptionClassName="space-y-3"
			description={
				<>
					<p>
						La commande {dialog.data?.orderLabel} sera annulée : sa session de paiement Stripe est
						fermée et le stock réservé redevient disponible.
					</p>
					<p className="text-destructive font-medium">Cette action est irréversible.</p>
				</>
			}
		/>
	);
}
