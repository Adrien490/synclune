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
import { useRetryFailedRefund } from "@/modules/refunds/hooks/use-retry-failed-refund";
import { ActionStatus } from "@/shared/types/server-action";
import { formatEuro } from "@/shared/utils/format-euro";
import { Spinner } from "@/shared/components/ui/spinner";

export const RETRY_REFUND_DIALOG_ID = "retry-refund";

interface RetryRefundData {
	refundId: string;
	amount: number;
	orderNumber: string;
	failureReason?: string | null;
	[key: string]: unknown;
}

/**
 * Relance d'un remboursement FAILED via `retryFailedRefund` (FAILED → APPROVED
 * + rotation d'attemptCount). C'est le chemin sûr : l'adoption IDEM-REFUND-001
 * retrouve un refund Stripe déjà créé par une tentative dont la réponse a été
 * perdue. Recréer un remboursement complet à la place produit un second Refund
 * orphelin et court-circuite cette protection (audit 2026-08-01, P2).
 */
export function RetryRefundAlertDialog() {
	const dialog = useAlertDialog<RetryRefundData>(RETRY_REFUND_DIALOG_ID);

	const { state, action, isPending } = useRetryFailedRefund({
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
	// Le préfixe [transient] est un marqueur interne (classifyStripeError) —
	// on l'affiche en clair : « erreur temporaire » = la relance a de bonnes
	// chances d'aboutir.
	const rawReason = dialog.data?.failureReason ?? null;
	const isTransient = rawReason?.startsWith("[transient]") ?? false;
	const displayReason = rawReason?.replace(/^\[transient\]\s*/, "") ?? null;

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="info">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.refundId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Relancer le remboursement</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Relancer le remboursement de <strong>{formattedAmount}</strong> pour la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> ?
								</p>
								{displayReason && (
									<p className="text-muted-foreground mt-4 text-sm">
										Échec précédent : {displayReason}
										{isTransient &&
											" (erreur temporaire — la relance a de bonnes chances d'aboutir)"}
									</p>
								)}
								<p className="text-muted-foreground mt-2 text-sm">
									La demande repasse en « Approuvé » puis est renvoyée à Stripe. Aucun risque de
									double débit : si Stripe avait déjà créé le remboursement, il est retrouvé et
									adopté.
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
							{isPending ? "Relance…" : "Relancer le remboursement"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
