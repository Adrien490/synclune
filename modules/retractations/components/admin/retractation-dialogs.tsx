"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { formatEuro } from "@/shared/utils/format-euro";

import { markReturnReceived } from "../../actions/mark-return-received";
import { refundRetractation } from "../../actions/refund-retractation";
import { rejectRetractation } from "../../actions/reject-retractation";
import {
	MARK_RETURN_RECEIVED_DIALOG_ID,
	REFUND_RETRACTATION_DIALOG_ID,
	REJECT_RETRACTATION_DIALOG_ID,
} from "../../constants/retractation.constants";

export interface RetractationDialogData {
	retractationId: string;
	/** « n° 12 » ou l'email — pour situer la commande dans le dialog. */
	orderLabel: string;
	amountTotalCents: number;
	[key: string]: unknown;
}

/** « Colis reçu » — RECEIVED/ACKNOWLEDGED → AWAITING_RETURN + itemReceivedAt. */
export function MarkReturnReceivedDialog() {
	const dialog = useAlertDialog<RetractationDialogData>(MARK_RETURN_RECEIVED_DIALOG_ID);
	const { action } = useActionWithToast(markReturnReceived);

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone="neutral"
			fields={{ retractationId: dialog.data?.retractationId }}
			title="Pointer le colis reçu ?"
			confirmLabel="Colis reçu"
			description={
				<>
					Le retour de la commande {dialog.data?.orderLabel} est arrivé à l&apos;atelier — la
					demande devient « à rembourser ».
				</>
			}
		/>
	);
}

/**
 * « Rembourser » — remboursement Stripe intégral + avoir. Le restock est
 * OPT-IN, décoché par défaut : un bijou retourné n'est pas forcément
 * revendable.
 */
export function RefundRetractationDialog() {
	const dialog = useAlertDialog<RetractationDialogData>(REFUND_RETRACTATION_DIALOG_ID);
	const { action } = useActionWithToast(refundRetractation);
	const [restock, setRestock] = useState(false);

	const handleClose = () => {
		dialog.close();
		setRestock(false);
	};

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={handleClose}
			action={action}
			fields={{
				retractationId: dialog.data?.retractationId,
				restock: restock ? "on" : null,
			}}
			title="Rembourser la commande ?"
			confirmLabel={`Rembourser ${dialog.data ? formatEuro(dialog.data.amountTotalCents) : ""}`}
			descriptionClassName="space-y-3"
			description={
				<>
					<p>
						La commande {dialog.data?.orderLabel} sera remboursée intégralement sur le moyen de
						paiement d&apos;origine (Stripe), un avoir sera émis et la cliente informée par email.
					</p>
					<p className="text-destructive font-medium">Un remboursement est irréversible.</p>
				</>
			}
		>
			<div className="flex items-start gap-3">
				<Checkbox
					id="refund-restock"
					checked={restock}
					onCheckedChange={setRestock}
					className="mt-0.5"
				/>
				<div className="space-y-1">
					<Label htmlFor="refund-restock">Remettre les articles en stock</Label>
					<p className="text-muted-foreground text-xs">
						Décoché par défaut : ne remets en vente que si les bijoux retournés sont en parfait
						état.
					</p>
				</div>
			</div>
		</ConfirmDialog>
	);
}

/** « Rejeter » — motif REQUIS, il part dans l'email d'information. */
export function RejectRetractationDialog() {
	const dialog = useAlertDialog<RetractationDialogData>(REJECT_RETRACTATION_DIALOG_ID);
	const { action } = useActionWithToast(rejectRetractation);
	const [adminReason, setAdminReason] = useState("");

	const handleClose = () => {
		dialog.close();
		setAdminReason("");
	};

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={handleClose}
			action={action}
			tone="destructive"
			fields={{ retractationId: dialog.data?.retractationId }}
			title="Rejeter la demande ?"
			confirmLabel="Rejeter et informer"
			confirmDisabled={adminReason.trim().length < 10}
			descriptionClassName="space-y-3"
			description={
				<>
					La demande de rétractation de la commande {dialog.data?.orderLabel} sera rejetée. Le motif
					ci-dessous est envoyé tel quel à la cliente — l&apos;exception légale (bijou personnalisé,
					hors délai…) est un arbitrage humain, jamais automatique.
				</>
			}
		>
			<div className="space-y-2">
				<Label htmlFor="reject-reason">Motif du rejet (envoyé à la cliente)</Label>
				<Textarea
					id="reject-reason"
					name="adminReason"
					rows={3}
					maxLength={1000}
					value={adminReason}
					onChange={(event) => setAdminReason(event.target.value)}
					placeholder="Ex. : la demande a été faite plus de 14 jours après la réception (art. L221-18)."
				/>
			</div>
		</ConfirmDialog>
	);
}
