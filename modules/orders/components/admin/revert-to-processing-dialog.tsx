"use client";

import { useState, useTransition } from "react";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { FieldLabel } from "@/shared/components/forms/field-label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useUpdateOrderStatus } from "@/modules/orders/hooks/use-update-order-status";
import { Spinner } from "@/shared/components/ui/spinner";

export const REVERT_TO_PROCESSING_DIALOG_ID = "revert-to-processing";

interface RevertToProcessingData {
	orderId: string;
	orderNumber: string;
	trackingNumber?: string | null;
	[key: string]: unknown;
}

export function RevertToProcessingDialog() {
	const dialog = useAlertDialog<RevertToProcessingData>(REVERT_TO_PROCESSING_DIALOG_ID);
	const { action } = useUpdateOrderStatus("revert-to-processing");
	const [isPending, startTransition] = useTransition();
	const [reason, setReason] = useState("");

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
			setReason("");
		}
	};

	const handleSubmit = () => {
		if (!reason.trim() || isPending) return;

		const formData = new FormData();
		formData.append("id", dialog.data?.orderId ?? "");
		formData.append("reason", reason);
		startTransition(async () => {
			await action(formData);
			dialog.close();
			setReason("");
		});
	};

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Annuler l'expédition</ResponsiveDialogTitle>
					<ResponsiveDialogDescription render={<div />}>
						<p>
							Êtes-vous sûr de vouloir annuler l'expédition de la commande{" "}
							<strong>{dialog.data?.orderNumber}</strong> ?
						</p>
						{dialog.data?.trackingNumber && (
							<>
								<p className="text-warning mt-2">
									Le numéro de suivi ({dialog.data.trackingNumber}) sera supprimé.
								</p>
								<p className="text-warning mt-2">
									⚠️ Le client a reçu un email d'expédition. Pensez à le prévenir manuellement que
									son numéro de suivi n'est plus valide.
								</p>
							</>
						)}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<div className="space-y-2 py-4">
					<FieldLabel htmlFor="reason" required>
						Raison de l'annulation
					</FieldLabel>
					<Textarea
						id="reason"
						placeholder="Ex: Erreur d'adresse, produit indisponible, demande client…"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						rows={3}
						disabled={isPending}
						className="resize-none"
					/>
					<p className="text-muted-foreground text-xs">
						Cette raison sera enregistrée dans l'historique de la commande.
					</p>
				</div>

				<ResponsiveDialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
						Fermer
					</Button>
					<Button
						variant="destructive"
						onClick={handleSubmit}
						disabled={!reason.trim() || isPending}
					>
						{isPending && <Spinner presentational />}
						Annuler l'expédition
					</Button>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
