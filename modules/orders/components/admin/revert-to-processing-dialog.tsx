"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useRevertToProcessing } from "@/modules/orders/hooks/admin/use-revert-to-processing";
import { useTransition } from "react";

export const REVERT_TO_PROCESSING_DIALOG_ID = "revert-to-processing";

interface RevertToProcessingData {
	orderId: string;
	orderNumber: string;
	trackingNumber?: string | null;
	[key: string]: unknown;
}

export function RevertToProcessingDialog() {
	const dialog = useAlertDialog<RevertToProcessingData>(
		REVERT_TO_PROCESSING_DIALOG_ID
	);
	const { action } = useRevertToProcessing();
	const [, startTransition] = useTransition();
	const [reason, setReason] = useState("");

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			dialog.close();
			setReason("");
		}
	};

	const handleSubmit = () => {
		if (!reason.trim()) return;

		const formData = new FormData();
		formData.append("id", dialog.data?.orderId ?? "");
		formData.append("reason", reason);
		startTransition(() => {
			action(formData);
		});
		dialog.close();
		setReason("");
	};

	return (
		<Dialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Annuler l'expédition</DialogTitle>
					<DialogDescription asChild>
						<div>
							<p>
								Es-tu sûr de vouloir annuler l'expédition de la commande{" "}
								<strong>{dialog.data?.orderNumber}</strong> ?
							</p>
							{dialog.data?.trackingNumber && (
								<p className="mt-2 text-amber-600">
									Le numéro de suivi ({dialog.data.trackingNumber}) sera
									supprimé.
								</p>
							)}
						</div>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2 py-4">
					<Label htmlFor="reason">
						Raison de l'annulation <span className="text-destructive">*</span>
					</Label>
					<Textarea
						id="reason"
						placeholder="Ex: Erreur d'adresse, produit indisponible, demande client..."
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						rows={3}
					/>
					<p className="text-muted-foreground text-xs">
						Cette raison sera enregistrée dans l'historique de la commande.
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Fermer
					</Button>
					<Button
						variant="destructive"
						onClick={handleSubmit}
						disabled={!reason.trim()}
					>
						Annuler l'expédition
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
