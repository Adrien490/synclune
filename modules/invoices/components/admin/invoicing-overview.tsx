import Link from "next/link";
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
import { ExportComptableForm } from "@/modules/invoices/components/admin/export-comptable-form";
import { InvoicesListTable } from "@/modules/invoices/components/admin/invoices-list-table";
import { AnomaliesSection } from "@/modules/invoices/components/admin/anomalies-section";
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
 *
 * EINV-UI-006 / EINV-UI-010 / EINV-UI-012 / EINV-UI-014 (audit 2026-05-28) :
 *   - drill-down links sur CounterCards
 *   - aria-live="polite" sur sections de compteurs
 *   - export comptable inline (livre de recettes)
 *   - liste des 10 dernières factures émises
 */
export function InvoicingOverviewSection({ overview }: InvoicingOverviewSectionProps) {
	const featureFlags: InvoiceFeatureFlags = INVOICE_FEATURE_FLAGS;
	const hasRejectedBatches = overview.rejectedBatches.length > 0;
	const hasAnomaly = overview.invoiceAnomalyCount > 0;

	return (
		<div className="space-y-8">
			{hasRejectedBatches && <RejectedBatchesAlert batches={overview.rejectedBatches} />}

			<AnomaliesSection anomalies={overview.anomalies} />

			<EReportingCoverageCard coverage={overview.eReportingCoverage} />

			<FeatureFlagsCard flags={featureFlags} />

			<section aria-labelledby="invoice-counters-heading" aria-live="polite" className="space-y-4">
				<h2 id="invoice-counters-heading" className="text-foreground text-lg font-medium">
					Factures
				</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<CounterCard
						icon={<Clock className="text-muted-foreground size-5" aria-hidden="true" />}
						label="En attente"
						value={overview.invoiceCounters.PENDING}
						hint="Statut facture = PENDING (en cours de génération)"
						href="/admin/ventes/commandes?filter_invoiceStatus=PENDING"
					/>
					<CounterCard
						icon={<Receipt className="text-success size-5" aria-hidden="true" />}
						label="Émises"
						value={overview.invoiceCounters.GENERATED}
						hint="Numéro F-YYYY-NNNNN attribué (Art. 286 CGI)"
						href="/admin/ventes/commandes?filter_invoiceStatus=GENERATED"
					/>
					<CounterCard
						icon={<FileWarning className="text-warning size-5" aria-hidden="true" />}
						label="Annulées (avoir)"
						value={overview.invoiceCounters.VOIDED}
						hint="VOIDED + avoir A-YYYY-NNNNN émis (Art. 272-I CGI)"
						href="/admin/ventes/commandes?filter_invoiceStatus=VOIDED"
					/>
					<CounterCard
						icon={
							<AlertTriangle
								className={hasAnomaly ? "text-destructive size-5" : "text-muted-foreground size-5"}
								aria-hidden="true"
							/>
						}
						label="Anomalies"
						value={overview.invoiceAnomalyCount}
						hint="Payée sans facture émise (Art. 286 / 289-I CGI)"
						href="/admin/ventes/commandes?filter_invoiceAnomaly=true"
						danger={hasAnomaly}
					/>
				</div>
			</section>

			<section
				aria-labelledby="ereporting-counters-heading"
				aria-live="polite"
				className="space-y-4"
			>
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

			<section aria-labelledby="export-comptable-heading" className="space-y-4">
				<h2 id="export-comptable-heading" className="text-foreground text-lg font-medium">
					Export comptable
				</h2>
				<ExportComptableForm />
			</section>

			<section aria-labelledby="recent-invoices-heading" className="space-y-4">
				<h2 id="recent-invoices-heading" className="text-foreground text-lg font-medium">
					Dernières factures émises
				</h2>
				<InvoicesListTable invoices={overview.recentInvoices} />
				<p className="text-muted-foreground text-xs">
					Recherche par numéro :{" "}
					<Link href="/admin/ventes/commandes?filter_invoiceStatus=GENERATED" className="underline">
						voir toutes les factures
					</Link>{" "}
					— la barre de recherche commandes accepte également un numéro F-YYYY-NNNNN ou
					A-YYYY-NNNNN.
				</p>
			</section>

			{overview.pendingBatches.length > 0 && (
				<section aria-labelledby="pending-batches-heading" className="space-y-4">
					<h2 id="pending-batches-heading" className="text-foreground text-lg font-medium">
						File de transmission ({overview.pendingBatches.length})
					</h2>
					<BatchesTable batches={overview.pendingBatches} showStatus />
				</section>
			)}

			<TransmissionSection transmission={overview.transmission} />
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
	href?: string;
}

function CounterCard({ icon, label, value, hint, compact, danger, href }: CounterCardProps) {
	const card = (
		<Card
			className={`${danger ? "border-destructive/50" : ""}${href ? "can-hover:hover:border-primary h-full motion-safe:transition-colors" : ""}`}
		>
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
	if (!href) return card;
	return (
		<Link
			href={href}
			className="focus-ring block rounded-md"
			aria-label={`${label} — voir les commandes correspondantes`}
		>
			{card}
		</Link>
	);
}

function EReportingCoverageCard({
	coverage,
}: {
	coverage: InvoicingOverview["eReportingCoverage"];
}) {
	const status = (ratio: number) => {
		if (ratio >= 0.99) return { label: "OK", variant: "default" as const };
		if (ratio >= 0.95) return { label: "À surveiller", variant: "secondary" as const };
		return { label: "Critique", variant: "destructive" as const };
	};
	const salesStatus = status(coverage.sales);
	const refundStatus = status(coverage.refund);
	const pct = (r: number) => `${Math.round(r * 100)}%`;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm">Couverture e-reporting 30j</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<div className="text-muted-foreground text-xs">SALES</div>
						<div className="mt-1 flex items-center gap-2">
							<span className="font-display text-2xl font-normal tabular-nums">
								{pct(coverage.sales)}
							</span>
							<Badge variant={salesStatus.variant}>{salesStatus.label}</Badge>
						</div>
						<p className="text-muted-foreground mt-1 text-xs">
							{coverage.paidOrders} commandes PAID 30j
						</p>
					</div>
					<div>
						<div className="text-muted-foreground text-xs">REFUND</div>
						<div className="mt-1 flex items-center gap-2">
							<span className="font-display text-2xl font-normal tabular-nums">
								{pct(coverage.refund)}
							</span>
							<Badge variant={refundStatus.variant}>{refundStatus.label}</Badge>
						</div>
						<p className="text-muted-foreground mt-1 text-xs">
							{coverage.paidRefunds} commandes remboursées 30j
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function RejectedBatchesAlert({ batches }: { batches: ReadonlyArray<BatchSummary> }) {
	return (
		<Alert variant="destructive">
			<AlertTriangle className="size-4" aria-hidden="true" />
			<AlertTitle>{batches.length} batch(es) e-reporting rejeté(s) par la DGFiP</AlertTitle>
			<AlertDescription className="space-y-2">
				<p>
					Action requise — ouvrir le détail du batch pour voir le payload XML et relancer la
					transmission après correction.
				</p>
				<ul className="space-y-1 text-sm">
					{batches.slice(0, 3).map((batch) => (
						<li key={batch.id}>
							<Link href={`/admin/ventes/facturation/batches/${batch.id}`} className="underline">
								Batch {batch.id.slice(0, 8)} — {batch.periodFrom.toISOString().slice(0, 10)}
							</Link>
						</li>
					))}
				</ul>
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

function TransmissionSection({
	transmission,
}: {
	transmission: InvoicingOverview["transmission"];
}) {
	// Pas de provider PDP actif ET aucune écriture historique → section masquée.
	const hasAnyTransmission = Object.values(transmission.counters).some((n) => n > 0);
	if (!transmission.providerActive && !hasAnyTransmission) {
		return null;
	}

	const hasRejected = transmission.recentRejected.length > 0;

	return (
		<section aria-labelledby="pdp-transmission-heading" aria-live="polite" className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<h2 id="pdp-transmission-heading" className="text-foreground text-lg font-medium">
					Transmission plateforme (B2B/B2G)
				</h2>
				<Badge variant={transmission.providerActive ? "default" : "outline"} className="text-xs">
					Provider · {transmission.providerName}{" "}
					{transmission.providerActive ? "actif" : "(local — aucune transmission)"}
				</Badge>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
				<CounterCard
					compact
					icon={<Clock className="text-muted-foreground size-4" aria-hidden="true" />}
					label="En attente"
					value={transmission.counters.PENDING}
				/>
				<CounterCard
					compact
					icon={<Send className="text-info size-4" aria-hidden="true" />}
					label="Transmises"
					value={transmission.counters.SENT}
				/>
				<CounterCard
					compact
					icon={<CheckCircle2 className="text-success size-4" aria-hidden="true" />}
					label="Acceptées"
					value={transmission.counters.ACCEPTED}
				/>
				<CounterCard
					compact
					icon={<XCircle className="text-destructive size-4" aria-hidden="true" />}
					label="Rejetées"
					value={transmission.counters.REJECTED}
					danger={transmission.counters.REJECTED > 0}
				/>
				<CounterCard
					compact
					icon={<Clock className="text-warning size-4" aria-hidden="true" />}
					label="Retry"
					value={transmission.counters.RETRYING}
				/>
				<CounterCard
					compact
					icon={<FileWarning className="text-muted-foreground size-4" aria-hidden="true" />}
					label="Annulées"
					value={transmission.counters.CANCELLED}
				/>
				<CounterCard
					compact
					icon={<AlertTriangle className="text-destructive size-4" aria-hidden="true" />}
					label="Abandonnées"
					value={transmission.counters.ABANDONED}
					danger={transmission.counters.ABANDONED > 0}
				/>
			</div>

			{hasRejected && (
				<div className="border-border rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Facture</TableHead>
								<TableHead>Commande</TableHead>
								<TableHead>Statut</TableHead>
								<TableHead>Code rejet</TableHead>
								<TableHead className="text-right">Retries</TableHead>
								<TableHead>Dernier essai</TableHead>
								<TableHead className="text-right">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{transmission.recentRejected.map((row) => (
								<TableRow key={row.orderId}>
									<TableCell className="font-mono text-xs">{row.invoiceNumber ?? "—"}</TableCell>
									<TableCell className="font-mono text-xs">{row.orderNumber}</TableCell>
									<TableCell>
										<Badge variant={row.pdpStatus === "ABANDONED" ? "destructive" : "secondary"}>
											{row.pdpStatus}
										</Badge>
									</TableCell>
									<TableCell className="text-xs">{row.pdpRejectionCode ?? "—"}</TableCell>
									<TableCell className="text-right text-xs">{row.pdpRetryCount}</TableCell>
									<TableCell className="text-muted-foreground text-xs">
										{row.pdpLastRetryAt
											? row.pdpLastRetryAt.toISOString().slice(0, 16).replace("T", " ")
											: "—"}
									</TableCell>
									<TableCell className="text-right">
										<Link
											href={`/admin/ventes/commandes/${row.orderId}`}
											className="text-sm underline"
											aria-label={`Voir le détail de la commande ${row.orderNumber}`}
										>
											Détail
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</section>
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
						<TableHead className="text-right">Action</TableHead>
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
							<TableCell className="text-right">
								<Link
									href={`/admin/ventes/facturation/batches/${batch.id}`}
									className="text-sm underline"
									aria-label={`Voir le détail du batch ${batch.id.slice(0, 8)}`}
								>
									Détail
								</Link>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
