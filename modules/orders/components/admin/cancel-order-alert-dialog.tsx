"use client";

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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useCancelOrder } from "@/modules/orders/hooks/use-cancel-order";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

export const CANCEL_ORDER_DIALOG_ID = "cancel-order";

interface CancelOrderData {
	orderId: string;
	orderNumber: string;
	isPaid: boolean;
	[key: string]: unknown;
}

export function CancelOrderAlertDialog() {
	const cancelDialog = useAlertDialog<CancelOrderData>(CANCEL_ORDER_DIALOG_ID);
	const [autoRefund, setAutoRefund] = useState(true);

	const { action, isPending } = useCancelOrder({
		onSuccess: () => {
			cancelDialog.close();
			setAutoRefund(true);
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			cancelDialog.close();
			setAutoRefund(true);
		}
	};

	const isPaid = cancelDialog.data?.isPaid ?? false;

	return (
		<ResponsiveAlertDialog open={cancelDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={cancelDialog.data?.orderId ?? ""} />
					<input type="hidden" name="autoRefund" value={isPaid && autoRefund ? "true" : "false"} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Confirmer l'annulation</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir annuler la commande{" "}
									<strong>{cancelDialog.data?.orderNumber}</strong> ?
								</p>
								{isPaid && (
									<div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
										<p className="text-amber-700 dark:text-amber-400">
											Cette commande a été payée. Le statut de paiement passera à REFUNDED.
										</p>
										<label
											htmlFor="cancel-order-auto-refund"
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												id="cancel-order-auto-refund"
												checked={autoRefund}
												onCheckedChange={(v) => setAutoRefund(v === true)}
												disabled={isPending}
											/>
											<span>
												Créer automatiquement le remboursement Stripe (sera traité par le cron)
											</span>
										</label>
										{!autoRefund && (
											<p className="text-muted-foreground text-xs">
												Sans cette option, le remboursement Stripe devra être créé manuellement
												depuis le module Remboursements.
											</p>
										)}
									</div>
								)}
								<p className="text-muted-foreground mt-4 text-sm">
									La commande restera en base de données pour préserver la traçabilité comptable
									(numérotation des factures).
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Fermer</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Annulation…" : "Annuler la commande"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
