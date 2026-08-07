"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FieldLabel } from "@/shared/components/forms/field-label";
import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useDeleteOrder } from "@/modules/orders/hooks/use-delete-order";

export const DELETE_ORDER_DIALOG_ID = "delete-order";

interface DeleteOrderData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

interface DeleteOrderAlertDialogProps {
	/**
	 * Où aller après une suppression réussie.
	 *
	 * Requis quand le dialog est monté sur la page détail de la commande : celle-ci
	 * porte l'entité qu'on vient de supprimer, donc rester dessus laisse l'admin sur
	 * une page morte. Sur la page LISTE, ne rien passer — la liste se revalide seule.
	 * `replace` (et non `push`) : l'URL du détail supprimé n'a rien à faire dans
	 * l'historique de navigation.
	 */
	successPath?: string;
}

export function DeleteOrderAlertDialog({ successPath }: DeleteOrderAlertDialogProps = {}) {
	const deleteDialog = useAlertDialog<DeleteOrderData>(DELETE_ORDER_DIALOG_ID);
	const router = useRouter();
	const [reason, setReason] = useState("");

	const { action } = useDeleteOrder({
		onSuccess: () => {
			setReason("");
			if (successPath) {
				router.replace(successPath);
			}
		},
	});

	const close = () => {
		setReason("");
		deleteDialog.close();
	};

	return (
		<ConfirmDialog
			open={deleteDialog.isOpen}
			onClose={close}
			action={action}
			tone="destructive"
			fields={{ id: deleteDialog.data?.orderId }}
			title="Confirmer la suppression"
			confirmLabel="Supprimer"
			// La friction tient au motif obligatoire. ⚠️ Elle DOIT passer par ce
			// garde JS et non par le `required` du champ : la confirmation se ferme
			// au clic, donc une contrainte HTML bloquerait la soumission dans une
			// surface déjà disparue — l'admin verrait le dialog s'évanouir sans
			// suppression ni message.
			confirmDisabled={reason.trim().length < 3}
			description={
				<>
					<p>
						Êtes-vous sûr de vouloir supprimer la commande{" "}
						<strong>{deleteDialog.data?.orderNumber}</strong> ?
					</p>
					<p className="text-destructive mt-2 font-medium">Cette action est irréversible.</p>
					<p className="text-muted-foreground mt-4 text-sm">
						Note: Seules les commandes sans facture et non payées peuvent être supprimées (commandes
						de test, abandonnées ou échouées).
					</p>
				</>
			}
		>
			<div className="mt-4 space-y-2">
				<FieldLabel htmlFor="delete-order-reason" required>
					Raison de la suppression
				</FieldLabel>
				<Textarea
					id="delete-order-reason"
					name="reason"
					required
					minLength={3}
					maxLength={500}
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="Ex: commande de test, paiement abandonné, doublon créé par erreur…"
					className="resize-none"
				/>
				<p className="text-muted-foreground text-xs">
					Tracée dans l&apos;audit trail (Art. L123-22, conservation 10 ans).
				</p>
			</div>
		</ConfirmDialog>
	);
}
