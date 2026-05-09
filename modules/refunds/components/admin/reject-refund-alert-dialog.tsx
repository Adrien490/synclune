"use client";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogHeroIcon,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useRejectRefund } from "@/modules/refunds/hooks/use-reject-refund";
import { ActionStatus } from "@/shared/types/server-action";
import { LoaderCircle, XCircle } from "lucide-react";

export const REJECT_REFUND_DIALOG_ID = "reject-refund";

interface RejectRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function RejectRefundAlertDialog() {
	const dialog = useAlertDialog<RejectRefundData>(REJECT_REFUND_DIALOG_ID);

	const { state, action, isPending } = useRejectRefund({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const formattedAmount = dialog.data?.amount ? (dialog.data.amount / 100).toFixed(2) : "0.00";

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="warning">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.refundId ?? ""} />

					<ResponsiveAlertDialogHeroIcon icon={XCircle} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Refuser le remboursement</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Refuser la demande de remboursement de <strong>{formattedAmount} €</strong> pour
									la commande <strong>{dialog.data?.orderNumber}</strong> ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Cette action est définitive. La demande sera marquée comme refusée.
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<div className="my-4 space-y-2">
						<Label htmlFor="reject-reason">Raison du refus (optionnel)</Label>
						<Textarea
							id="reject-reason"
							name="reason"
							placeholder="Indiquez la raison du refus…"
							rows={3}
							maxLength={500}
							disabled={isPending}
						/>
					</div>
					{state?.status && state.status !== ActionStatus.SUCCESS && (
						<p className="text-destructive mb-4 text-sm">{state.message}</p>
					)}
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="motion-safe:animate-spin" />}
							{isPending ? "Refus…" : "Refuser"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
