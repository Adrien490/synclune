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
import { useApproveRefund } from "@/modules/refunds/hooks/use-approve-refund";
import { ActionStatus } from "@/shared/types/server-action";
import { formatEuro } from "@/shared/utils/format-euro";
import { Spinner } from "@/shared/components/ui/spinner";

export const APPROVE_REFUND_DIALOG_ID = "approve-refund";

interface ApproveRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	[key: string]: unknown;
}

export function ApproveRefundAlertDialog() {
	const dialog = useAlertDialog<ApproveRefundData>(APPROVE_REFUND_DIALOG_ID);

	const { state, action, isPending } = useApproveRefund({
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
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="success">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.refundId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Approuver le remboursement</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Approuver le remboursement de <strong>{formattedAmount}</strong> pour la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Après approbation, vous pourrez procéder au remboursement effectif via Stripe.
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
							{isPending ? "Approbation…" : "Approuver"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
