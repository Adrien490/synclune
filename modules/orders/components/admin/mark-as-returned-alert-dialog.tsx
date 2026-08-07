"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useUpdateOrderStatus } from "@/modules/orders/hooks/use-update-order-status";

export const MARK_AS_RETURNED_DIALOG_ID = "mark-as-returned";

interface MarkAsReturnedData {
	orderId: string;
	orderNumber: string;
	showRefundPrompt?: boolean;
	[key: string]: unknown;
}

export function MarkAsReturnedAlertDialog() {
	const dialog = useAlertDialog<MarkAsReturnedData>(MARK_AS_RETURNED_DIALOG_ID);

	const { action } = useUpdateOrderStatus("returned", {
		onSuccess: () => {
			dialog.open({ ...dialog.data!, showRefundPrompt: true });
		},
	});

	// Deux écrans successifs, donc DEUX confirmations distinctes : la seconde est
	// un accusé de réception sans annulation possible.
	if (dialog.data?.showRefundPrompt) {
		return (
			<ConfirmDialog
				open={dialog.isOpen}
				onClose={dialog.close}
				onConfirm={dialog.close}
				tone="info"
				hideCancel
				title="Commande retournée"
				confirmLabel="Compris"
				description={
					<>
						<p>
							La commande <strong>{dialog.data.orderNumber}</strong> a été marquée comme retournée.
						</p>
						{/* Lot 2 S3.3 : le remboursement se fait dans le dashboard Stripe
						    (lien « Rembourser dans Stripe » sur la page commande) — le
						    webhook crée la fiche ici, avec avoir et email automatiques. */}
						<p className="mt-2">
							Si tu veux la rembourser, passe par le dashboard Stripe : la fiche remboursement,
							l&apos;avoir et l&apos;email partiront tout seuls.
						</p>
					</>
				}
			/>
		);
	}

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone="warning"
			fields={{ id: dialog.data?.orderId }}
			title="Marquer comme retourné"
			confirmLabel="Marquer comme retourné"
			description={
				<>
					<p>
						Êtes-vous sûr de vouloir marquer la commande <strong>{dialog.data?.orderNumber}</strong>{" "}
						comme retournée ?
					</p>
					<p className="text-muted-foreground mt-4 text-sm">
						Le statut de livraison passera à "Retourné". Vous pourrez ensuite créer un remboursement
						si nécessaire.
					</p>
				</>
			}
		/>
	);
}
