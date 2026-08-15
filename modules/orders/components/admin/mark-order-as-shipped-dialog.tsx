"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { markOrderAsShipped } from "../../actions/mark-order-as-shipped";
import { MARK_ORDER_AS_SHIPPED_DIALOG_ID } from "../../constants/order.constants";
import type { OrderActionsData } from "../../hooks/use-order-actions";

/**
 * « Marquer expédiée » — saisie du numéro de suivi puis PAID → SHIPPED.
 *
 * `confirmDisabled` est le SEUL mécanisme de validation admis ici : le bouton
 * de confirmation ferme le dialog AU CLIC (Close Base UI), une contrainte
 * HTML `required` ne serait jamais rapportée. Le transporteur est détecté
 * automatiquement du numéro (`detectCarrierAndUrl`) côté serveur.
 */
export function MarkOrderAsShippedDialog() {
	const dialog = useAlertDialog<OrderActionsData>(MARK_ORDER_AS_SHIPPED_DIALOG_ID);
	const { action } = useActionWithToast(markOrderAsShipped);
	const [trackingNumber, setTrackingNumber] = useState("");

	// Champ remis à zéro à la fermeture (le composant survit aux fermetures) —
	// `onClose` est aussi appelé au clic de confirmation, donc pas d'effet.
	const handleClose = () => {
		dialog.close();
		setTrackingNumber("");
	};

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={handleClose}
			action={action}
			fields={{ orderId: dialog.data?.orderId }}
			title="Marquer la commande comme expédiée"
			confirmLabel="Confirmer l'expédition"
			confirmDisabled={trackingNumber.trim().length < 4}
			description={
				<>
					La commande {dialog.data?.orderLabel} passera au statut « Expédiée » et la cliente recevra
					l&apos;email d&apos;expédition avec le lien de suivi.
				</>
			}
		>
			<div className="space-y-2">
				<Label htmlFor="shipping-tracking-number">Numéro de suivi</Label>
				<Input
					id="shipping-tracking-number"
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
		</ConfirmDialog>
	);
}
