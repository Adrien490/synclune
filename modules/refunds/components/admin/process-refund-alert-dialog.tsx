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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useProcessRefund } from "@/modules/refunds/hooks/use-process-refund";
import { ActionStatus } from "@/shared/types/server-action";
import { formatEuro } from "@/shared/utils/format-euro";
import { Spinner } from "@/shared/components/ui/spinner";

export const PROCESS_REFUND_DIALOG_ID = "process-refund";

interface ProcessRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function ProcessRefundAlertDialog() {
	const dialog = useAlertDialog<ProcessRefundData>(PROCESS_REFUND_DIALOG_ID);

	const { state, action, isPending } = useProcessRefund({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const formattedAmount = formatEuro(dialog.data?.amount ?? 0);

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="info">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.refundId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Traiter le remboursement</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Procéder au remboursement de <strong>{formattedAmount}</strong> pour la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> ?
								</p>
								<p className="text-warning-foreground mt-4 text-sm">
									Cette action va effectuer le remboursement via Stripe. Le montant sera crédité sur
									le moyen de paiement du client sous 5-10 jours ouvrés.
								</p>
								<p className="text-muted-foreground mt-2 text-sm">
									Le stock sera automatiquement restauré pour les articles marqués "à restocker".
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					{state?.status && state.status !== ActionStatus.SUCCESS && (
						<p className="text-destructive mb-4 text-sm">{state.message}</p>
					)}
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
							{isPending ? "Traitement…" : "Traiter le remboursement"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
