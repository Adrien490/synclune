"use client";

import { useState } from "react";
import { Label } from "@/shared/components/ui/label";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDeleteOrder } from "@/modules/orders/hooks/use-delete-order";
import { LoaderCircle } from "lucide-react";

export const DELETE_ORDER_DIALOG_ID = "delete-order";

interface DeleteOrderData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function DeleteOrderAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteOrderData>(DELETE_ORDER_DIALOG_ID);
	const [reason, setReason] = useState("");

	const { action, isPending } = useDeleteOrder({
		onSuccess: () => {
			setReason("");
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			setReason("");
			deleteDialog.close();
		}
	};

	return (
		<ResponsiveAlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={deleteDialog.data?.orderId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Confirmer la suppression</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir supprimer la commande{" "}
									<strong>{deleteDialog.data?.orderNumber}</strong> ?
								</p>
								<p className="text-destructive mt-2 font-medium">Cette action est irréversible.</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Note: Seules les commandes sans facture et non payées peuvent être supprimées
									(commandes de test, abandonnées ou échouées).
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>

					<div className="mt-4 space-y-2">
						<Label htmlFor="delete-order-reason">
							Raison de la suppression <span className="text-destructive">*</span>
						</Label>
						<Textarea
							id="delete-order-reason"
							name="reason"
							required
							minLength={3}
							maxLength={500}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Ex: commande de test, paiement abandonné, doublon créé par erreur…"
							disabled={isPending}
						/>
						<p className="text-muted-foreground text-xs">
							Tracée dans l&apos;audit trail (Art. L123-22, conservation 10 ans).
						</p>
					</div>

					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="submit"
							disabled={isPending || reason.trim().length < 3}
							aria-busy={isPending}
						>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Suppression…" : "Supprimer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
