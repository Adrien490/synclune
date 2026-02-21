"use client";

import { useState } from "react";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useRevertToProcessing } from "@/modules/orders/hooks/use-revert-to-processing";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

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
					<ResponsiveDialogDescription asChild>
						<div>
							<p>
								Êtes-vous sûr de vouloir annuler l'expédition de la commande{" "}
								<strong>{dialog.data?.orderNumber}</strong> ?
							</p>
							{dialog.data?.trackingNumber && (
								<p className="mt-2 text-amber-600">
									Le numéro de suivi ({dialog.data.trackingNumber}) sera
									supprimé.
								</p>
							)}
						</div>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

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
						disabled={isPending}
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
						{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
						Annuler l'expédition
					</Button>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
