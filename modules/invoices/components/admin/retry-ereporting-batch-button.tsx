"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useActionState } from "react";
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
 */
export function RetryEReportingBatchButton({
	batchId,
	disabled,
	disabledReason,
}: RetryEReportingBatchButtonProps) {
	const [, action, isPending] = useActionState(
		withCallbacks(
			retryEReportingBatch,
			createToastCallbacks({
				loadingMessage: "Relance transmission e-reporting…",
			}),
		),
		undefined,
	);

	return (
		<form action={action} className="inline-flex">
			<input type="hidden" name="id" value={batchId} />
			<Button
				type="submit"
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
		</form>
	);
}
