"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { updateTrackingNumber } from "../../actions/update-tracking-number";
import { UPDATE_TRACKING_NUMBER_DIALOG_ID } from "../../constants/order.constants";
import type { OrderActionsData } from "../../hooks/use-order-actions";

/**
 * « Corriger le n° de suivi » — remplace le numéro d'une commande SHIPPED
 * (une faute de frappe était sinon verrouillée par la garde PAID de « Marquer
 * expédiée »). Le renvoi d'email est opt-in, décoché par défaut : corriger un
 * caractère ne doit pas spammer la cliente — même convention que le restock du
 * remboursement (`fields` porte "on"/null, cf. `retractation-dialogs.tsx`).
 *
 * `confirmDisabled` est le SEUL mécanisme de validation admis ici (le bouton
 * de confirmation ferme le dialog AU CLIC, un `required` HTML ne serait jamais
 * rapporté).
 */
export function UpdateTrackingNumberDialog() {
	const dialog = useAlertDialog<OrderActionsData>(UPDATE_TRACKING_NUMBER_DIALOG_ID);
	const { action } = useActionWithToast(updateTrackingNumber);
	const [trackingNumber, setTrackingNumber] = useState("");
	const [resendEmail, setResendEmail] = useState(false);

	// Champs remis à zéro à la fermeture (le composant survit aux fermetures) —
	// `onClose` est aussi appelé au clic de confirmation, donc pas d'effet.
	const handleClose = () => {
		dialog.close();
		setTrackingNumber("");
		setResendEmail(false);
	};

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={handleClose}
			action={action}
			fields={{
				orderId: dialog.data?.orderId,
				resendEmail: resendEmail ? "on" : null,
			}}
			title="Corriger le numéro de suivi"
			confirmLabel="Corriger le numéro"
			confirmDisabled={trackingNumber.trim().length < 4}
			description={
				<>
					Le numéro de suivi de la commande {dialog.data?.orderLabel} sera remplacé — le lien de la
					page de suivi pointera vers le nouveau numéro.
				</>
			}
		>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="update-tracking-number">Nouveau numéro de suivi</Label>
					<Input
						id="update-tracking-number"
						name="trackingNumber"
						value={trackingNumber}
						onChange={(event) => setTrackingNumber(event.target.value)}
						placeholder="Ex. 8N00234567890"
						autoComplete="off"
					/>
					<p className="text-muted-foreground text-xs">
						Le transporteur (Colissimo, Chronopost, Mondial Relay…) est reconnu automatiquement.
					</p>
				</div>
				<div className="flex items-start gap-2">
					<Checkbox
						id="update-tracking-resend"
						checked={resendEmail}
						onCheckedChange={setResendEmail}
					/>
					<div className="space-y-1">
						<Label htmlFor="update-tracking-resend">Renvoyer l&apos;email à la cliente</Label>
						<p className="text-muted-foreground text-xs">
							Elle recevra un nouvel email d&apos;expédition avec le lien corrigé.
						</p>
					</div>
				</div>
			</div>
		</ConfirmDialog>
	);
}
