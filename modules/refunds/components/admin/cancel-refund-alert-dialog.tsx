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
import { useCancelRefund } from "@/modules/refunds/hooks/use-cancel-refund";
import { ActionStatus } from "@/shared/types/server-action";
import { formatEuro } from "@/shared/utils/format-euro";
import { LoaderCircle } from "lucide-react";

export const CANCEL_REFUND_DIALOG_ID = "cancel-refund";

interface CancelRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function CancelRefundAlertDialog() {
	const dialog = useAlertDialog<CancelRefundData>(CANCEL_REFUND_DIALOG_ID);

	const { state, action, isPending } = useCancelRefund({
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
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="warning">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.refundId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Annuler la demande de remboursement
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Annuler la demande de remboursement de <strong>{formattedAmount}</strong> pour la
									commande <strong>{dialog.data?.orderNumber}</strong> ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									La demande sera supprimée. Vous pourrez en créer une nouvelle si nécessaire.
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					{state?.status && state.status !== ActionStatus.SUCCESS && (
						<p className="text-destructive mb-4 text-sm">{state.message}</p>
					)}
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Fermer</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="motion-safe:animate-spin" />}
							{isPending ? "Annulation…" : "Annuler la demande"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
