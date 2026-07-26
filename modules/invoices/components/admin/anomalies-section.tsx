"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { formatEuro } from "@/shared/utils/format-euro";
import type { ActionState } from "@/shared/types/server-action";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { retryInvoiceGeneration } from "@/modules/invoices/actions/retry-invoice-generation";
import type {
	InvoiceAnomaly,
	InvoiceAnomalyType,
} from "@/modules/invoices/data/get-invoicing-overview";

const ANOMALY_LABELS: Record<InvoiceAnomalyType, string> = {
	MISSING_INVOICE_NUMBER: "Numéro absent",
	MISSING_PDF: "PDF absent",
	MISSING_CREDIT_NOTE: "Avoir absent",
};

interface AnomaliesSectionProps {
	anomalies: ReadonlyArray<InvoiceAnomaly>;
}

/**
 * Audit monitoring 2026-05-28 EINV-OPS-007 : section actionnable des
 * commandes en anomalie facturation. Le cron `reconcile-invoices` (daily)
 * écoule la file en arrière-plan ; ce panneau permet à l'admin de forcer
 * une relance synchronisée.
 */
export function AnomaliesSection({ anomalies }: AnomaliesSectionProps) {
	if (anomalies.length === 0) return null;

	return (
		<section aria-labelledby="invoice-anomalies-heading" className="space-y-4">
			<h2 id="invoice-anomalies-heading" className="text-foreground text-lg font-medium">
				Factures à résoudre ({anomalies.length})
			</h2>
			<Alert variant="destructive">
				<AlertTriangle className="size-4" aria-hidden="true" />
				<AlertTitle>Anomalies actionnables</AlertTitle>
				<AlertDescription>
					Le cron <code className="bg-destructive/10 rounded px-1 text-xs">reconcile-invoices</code>{" "}
					(daily 02:00) rejoue automatiquement. Bouton "Relancer" pour intervention manuelle
					immédiate. Voir{" "}
					<code className="bg-destructive/10 rounded px-1 text-xs">docs/RUNBOOK.md</code>.
				</AlertDescription>
			</Alert>
			<div className="border-border rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Commande</TableHead>
							<TableHead>Type</TableHead>
							<TableHead className="text-right">Montant</TableHead>
							<TableHead className="text-right">Tentatives</TableHead>
							<TableHead>Payée le</TableHead>
							<TableHead className="text-right">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{anomalies.map((a) => (
							<AnomalyRow key={a.orderId} anomaly={a} />
						))}
					</TableBody>
				</Table>
			</div>
		</section>
	);
}

function AnomalyRow({ anomaly }: { anomaly: InvoiceAnomaly }) {
	// Feedback aligné sur le reste de l'admin : loader (spinner bouton) +
	// toast (→ pastille MicroToast sur mobile) au lieu d'un statut inline.
	const [, formAction, pending] = useActionState<ActionState | undefined, FormData>(
		withCallbacks(
			retryInvoiceGeneration,
			createToastCallbacks({ loadingMessage: "Relance en cours…" }),
		),
		undefined,
	);

	return (
		<TableRow>
			<TableCell>
				<Link
					href={`/admin/ventes/commandes/${anomaly.orderId}`}
					className="font-mono text-xs underline-offset-2 hover:underline"
				>
					{anomaly.orderNumber}
				</Link>
			</TableCell>
			<TableCell>
				<Badge variant="destructive">{ANOMALY_LABELS[anomaly.type]}</Badge>
			</TableCell>
			<TableCell className="text-right">{formatEuro(anomaly.total)}</TableCell>
			<TableCell className="text-right tabular-nums">{anomaly.invoiceReconcileAttempts}</TableCell>
			<TableCell className="text-muted-foreground text-xs">
				{anomaly.paidAt ? anomaly.paidAt.toISOString().slice(0, 10) : "—"}
			</TableCell>
			<TableCell className="text-right">
				<form action={formAction} className="inline-flex items-center gap-2">
					<input type="hidden" name="orderId" value={anomaly.orderId} />
					<Button
						type="submit"
						size="sm"
						variant="outline"
						disabled={pending}
						aria-label={`Relancer la génération pour la commande ${anomaly.orderNumber}`}
					>
						{pending ? (
							<Loader2 className="size-3 animate-spin" aria-hidden="true" />
						) : (
							<RotateCw className="size-3" aria-hidden="true" />
						)}
						<span className="ml-1.5">Relancer</span>
					</Button>
				</form>
			</TableCell>
		</TableRow>
	);
}
