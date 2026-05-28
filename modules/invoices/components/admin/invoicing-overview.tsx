import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	FileWarning,
	Receipt,
	Send,
	XCircle,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { formatEuro } from "@/shared/utils/format-euro";
import {
	INVOICE_FEATURE_FLAGS,
	type InvoiceFeatureFlags,
} from "@/modules/invoices/constants/feature-flags";
import type {
	BatchSummary,
	InvoicingOverview,
} from "@/modules/invoices/data/get-invoicing-overview";

interface InvoicingOverviewSectionProps {
	overview: InvoicingOverview;
}

/**
 * Vue d'ensemble admin du module facturation — KPIs + e-reporting status.
 *
 * Server Component pur — toutes les données arrivent via props (calculées
 * dans `getInvoicingOverview`). Le wrapper page applique l'auth guard.
 */
export function InvoicingOverviewSection({ overview }: InvoicingOverviewSectionProps) {
	const featureFlags: InvoiceFeatureFlags = INVOICE_FEATURE_FLAGS;
	const hasRejectedBatches = overview.rejectedBatches.length > 0;

	return (
		<div className="space-y-8">
			{hasRejectedBatches && <RejectedBatchesAlert batches={overview.rejectedBatches} />}

			<FeatureFlagsCard flags={featureFlags} />

			<section aria-labelledby="invoice-counters-heading" className="space-y-4">
				<h2 id="invoice-counters-heading" className="text-foreground text-lg font-medium">
					Factures
				</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<CounterCard
						icon={<Clock className="text-muted-foreground size-5" aria-hidden="true" />}
						label="En attente"
						value={overview.invoiceCounters.PENDING}
						hint="Commandes payées sans numéro de facture (anomalie si > 0)"
					/>
					<CounterCard
						icon={<Receipt className="text-success size-5" aria-hidden="true" />}
						label="Émises"
						value={overview.invoiceCounters.GENERATED}
						hint="Numéro F-YYYY-NNNNN attribué (Art. 286 CGI)"
					/>
					<CounterCard
						icon={<FileWarning className="text-warning size-5" aria-hidden="true" />}
						label="Annulées (avoir)"
						value={overview.invoiceCounters.VOIDED}
						hint="VOIDED + avoir A-YYYY-NNNNN émis (Art. 272-I CGI)"
					/>
				</div>
			</section>

			<section aria-labelledby="ereporting-counters-heading" className="space-y-4">
				<h2 id="ereporting-counters-heading" className="text-foreground text-lg font-medium">
					E-reporting DGFiP
				</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					<CounterCard
						compact
						icon={<Clock className="text-muted-foreground size-4" aria-hidden="true" />}
						label="En attente"
						value={overview.batchCounters.PENDING}
					/>
					<CounterCard
						compact
						icon={<Send className="text-info size-4" aria-hidden="true" />}
						label="Transmis"
						value={overview.batchCounters.SENT}
					/>
					<CounterCard
						compact
						icon={<CheckCircle2 className="text-success size-4" aria-hidden="true" />}
						label="Acceptés"
						value={overview.batchCounters.ACCEPTED}
					/>
					<CounterCard
						compact
						icon={<XCircle className="text-destructive size-4" aria-hidden="true" />}
						label="Rejetés"
						value={overview.batchCounters.REJECTED}
						danger={overview.batchCounters.REJECTED > 0}
					/>
					<CounterCard
						compact
						icon={<Clock className="text-warning size-4" aria-hidden="true" />}
						label="Retry"
						value={overview.batchCounters.RETRYING}
					/>
					<CounterCard
						compact
						icon={<AlertTriangle className="text-destructive size-4" aria-hidden="true" />}
						label="Abandonnés"
						value={overview.batchCounters.ABANDONED}
						danger={overview.batchCounters.ABANDONED > 0}
					/>
				</div>
			</section>

			<section aria-labelledby="recent-activity-heading" className="space-y-4">
				<h2 id="recent-activity-heading" className="text-foreground text-lg font-medium">
					30 derniers jours
				</h2>
				<div className="grid gap-4 sm:grid-cols-3">
					<CounterCard
						label="CA encaissé TTC"
						value={formatEuro(overview.last30DaysRevenueCents)}
						hint="Filtre paidAt (Art. 50-0 CGI — encaissement)"
					/>
					<CounterCard
						label="Transactions ventes"
						value={overview.last30DaysTransactionCount}
						hint="SALES e-reporting créées"
					/>
					<CounterCard
						label="Transactions refunds"
						value={overview.last30DaysRefundCount}
						hint="REFUND e-reporting créées (avoirs)"
					/>
				</div>
			</section>

			{overview.pendingBatches.length > 0 && (
				<section aria-labelledby="pending-batches-heading" className="space-y-4">
					<h2 id="pending-batches-heading" className="text-foreground text-lg font-medium">
						File de transmission ({overview.pendingBatches.length})
					</h2>
					<BatchesTable batches={overview.pendingBatches} showStatus />
				</section>
			)}
		</div>
	);
}

// ============================================================================
// Sub-components
// ============================================================================

interface CounterCardProps {
	icon?: React.ReactNode;
	label: string;
	value: string | number;
	hint?: string;
	compact?: boolean;
	danger?: boolean;
}

function CounterCard({ icon, label, value, hint, compact, danger }: CounterCardProps) {
	return (
		<Card className={danger ? "border-destructive/50" : undefined}>
			<CardHeader className={compact ? "pb-2" : undefined}>
				<CardTitle className="flex items-center gap-2 text-sm font-medium">
					{icon}
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div
					className={`font-display ${compact ? "text-2xl" : "text-3xl"} font-normal ${danger ? "text-destructive" : ""}`}
				>
					{value}
				</div>
				{hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
			</CardContent>
		</Card>
	);
}

function RejectedBatchesAlert({ batches }: { batches: ReadonlyArray<BatchSummary> }) {
	return (
		<Alert variant="destructive">
			<AlertTriangle className="size-4" aria-hidden="true" />
			<AlertTitle>{batches.length} batch(es) e-reporting rejeté(s) par la DGFiP</AlertTitle>
			<AlertDescription>
				Action requise — corriger le payload et relancer la transmission. Cf. logs Sentry tag
				<code className="bg-destructive/10 ml-1 rounded px-1 py-0.5 text-xs">
					cronJob:transmit-ereporting-batch
				</code>
				.
			</AlertDescription>
		</Alert>
	);
}

function FeatureFlagsCard({ flags }: { flags: InvoiceFeatureFlags }) {
	return (
		<Card className="border-info/30 bg-info/5">
			<CardHeader>
				<CardTitle className="text-sm">État du module facturation</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-2 text-sm">
					<Flag label="XML structuré (Factur-X/UBL/CII)" active={flags.enable_xml} />
					<Flag label="E-reporting B2C DGFiP" active={flags.enable_ereporting} />
				</div>
				<p className="text-muted-foreground mt-3 text-xs">
					Les flags sont pilotés par les variables d&apos;environnement
					<code className="bg-muted ml-1 rounded px-1 py-0.5">INVOICE_ENABLE_*</code>. Quand un flag
					est OFF, les services associés répondent &quot;skipped&quot; silencieusement
					(fail-closed).
				</p>
			</CardContent>
		</Card>
	);
}

function Flag({ label, active }: { label: string; active: boolean }) {
	return (
		<Badge variant={active ? "default" : "outline"} className="text-xs">
			{active ? "ON" : "OFF"} · {label}
		</Badge>
	);
}

function BatchesTable({
	batches,
	showStatus,
}: {
	batches: ReadonlyArray<BatchSummary>;
	showStatus?: boolean;
}) {
	return (
		<div className="border-border rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Période</TableHead>
						<TableHead className="text-right">Transactions</TableHead>
						<TableHead className="text-right">Montant TTC</TableHead>
						{showStatus && <TableHead>Statut</TableHead>}
						<TableHead>Créé le</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{batches.map((batch) => (
						<TableRow key={batch.id}>
							<TableCell className="font-mono text-xs">
								{batch.periodFrom.toISOString().slice(0, 10)}
							</TableCell>
							<TableCell className="text-right">{batch.transactionCount}</TableCell>
							<TableCell className="text-right">{formatEuro(batch.totalAmountIncTax)}</TableCell>
							{showStatus && (
								<TableCell>
									<Badge variant={batch.status === "REJECTED" ? "destructive" : "secondary"}>
										{batch.status}
									</Badge>
								</TableCell>
							)}
							<TableCell className="text-muted-foreground text-xs">
								{batch.createdAt.toISOString().slice(0, 16).replace("T", " ")}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
