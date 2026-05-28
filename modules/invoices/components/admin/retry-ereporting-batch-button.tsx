"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useActionState, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { retryEReportingBatch } from "@/modules/invoices/actions/retry-ereporting-batch";

interface RetryEReportingBatchButtonProps {
	batchId: string;
	disabled?: boolean;
	disabledReason?: string;
}

/**
 * Bouton Client Component pour déclencher la Server Action
 * `retryEReportingBatch` depuis la page détail batch. Affichage neutralisé si
 * la feature flag `INVOICE_ENABLE_EREPORTING` est OFF — la Server Action
 * elle-même renverra une erreur explicite, mais on rend le bouton désactivé
 * pour éviter le clic inutile.
 *
 * EINV-UI-107 : la relance vers la DGFiP étant conséquente, elle passe par une
 * confirmation explicite (AlertDialog) avant déclenchement.
 */
export function RetryEReportingBatchButton({
	batchId,
	disabled,
	disabledReason,
}: RetryEReportingBatchButtonProps) {
	const [open, setOpen] = useState(false);
	const [, action, isPending] = useActionState(
		withCallbacks(
			retryEReportingBatch,
			createToastCallbacks({
				loadingMessage: "Relance transmission e-reporting…",
				onSuccess: () => setOpen(false),
			}),
		),
		undefined,
	);

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled === true || isPending}
					aria-busy={isPending || undefined}
					title={disabledReason}
				>
					{isPending ? (
						<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
					) : (
						<RotateCcw className="size-4" aria-hidden="true" />
					)}
					{isPending ? "Relance…" : "Relancer la transmission"}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<form action={action} aria-busy={isPending || undefined}>
					<input type="hidden" name="id" value={batchId} />
					<AlertDialogHeader>
						<AlertDialogTitle>Relancer la transmission DGFiP ?</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-2">
								<p>
									Le batch sera remis en file de transmission (statut PENDING) et le cron{" "}
									<code className="bg-muted rounded px-1 py-0.5 text-xs">
										transmit-ereporting-batch
									</code>{" "}
									le retraitera au prochain tick.
								</p>
								<p className="text-muted-foreground text-sm">
									À ne lancer qu&apos;après correction de la cause du rejet.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending || undefined}
						>
							{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
							{isPending ? "Relance…" : "Confirmer la relance"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
