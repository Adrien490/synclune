"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useMarkAsPaid } from "@/modules/orders/hooks/use-mark-as-paid";
import { Checkbox } from "@/shared/components/ui/checkbox";

export const MARK_AS_PAID_DIALOG_ID = "mark-as-paid";

interface MarkAsPaidData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsPaidAlertDialog() {
	const dialog = useAlertDialog<MarkAsPaidData>(MARK_AS_PAID_DIALOG_ID);
	const [confirmed, setConfirmed] = useState(false);

	const { action } = useMarkAsPaid({ onSuccess: () => setConfirmed(false) });

	const close = () => {
		setConfirmed(false);
		dialog.close();
	};

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={close}
			action={action}
			tone="success"
			fields={{ id: dialog.data?.orderId }}
			title="Confirmer le paiement manuel"
			confirmLabel="Marquer comme payée"
			// ⚠️ L'attestation était portée par le `required` HTML de la case. Elle ne
			// pouvait pas fonctionner : la confirmation se ferme au clic, donc le
			// navigateur bloquait la soumission dans une surface déjà disparue —
			// l'admin voyait le dialog s'évanouir sans que rien ne se passe, le
			// serveur restant seul à refuser (EINV-CASH-002, `mark-as-paid.ts`).
			confirmDisabled={!confirmed}
			description={
				<>
					<p>
						Êtes-vous sûr de vouloir marquer la commande <strong>{dialog.data?.orderNumber}</strong>{" "}
						comme payée ?
					</p>
					<p className="text-muted-foreground mt-4 text-sm">
						Cette action est utilisée pour les paiements par virement ou chèque. La commande passera
						en statut "En préparation".
					</p>
				</>
			}
		>
			{/* EINV-CASH-002 : attestation explicite d'encaissement hors Stripe,
			    requise côté serveur quand le paiement Stripe n'a pas abouti. */}
			<div className="mt-4 flex items-start gap-2 text-sm">
				<Checkbox
					id="confirm-off-stripe-payment"
					name="confirmOffStripePayment"
					checked={confirmed}
					onCheckedChange={setConfirmed}
					className="mt-0.5"
				/>
				<label htmlFor="confirm-off-stripe-payment">
					Je confirme avoir reçu le paiement <strong>hors Stripe</strong> (virement, chèque). Cette
					attestation sera consignée dans l&apos;historique de la commande.
				</label>
			</div>
		</ConfirmDialog>
	);
}
