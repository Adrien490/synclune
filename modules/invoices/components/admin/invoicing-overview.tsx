import Link from "next/link";
import { FileXIcon, ReceiptIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatEuro } from "@/shared/utils/format-euro";
import { ExportComptableForm } from "@/modules/invoices/components/admin/export-comptable-form";
import { InvoicesListTable } from "@/modules/invoices/components/admin/invoices-list-table";
import { AnomaliesSection } from "@/modules/invoices/components/admin/anomalies-section";
import type { InvoicingOverview } from "@/modules/invoices/data/get-invoicing-overview";

interface InvoicingOverviewSectionProps {
	overview: InvoicingOverview;
}

/**
 * Vue d'ensemble admin du module facturation — KPIs factures.
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
	const hasAnomaly = overview.invoiceAnomalyCount > 0;

	return (
		<div className="space-y-8">
			<AnomaliesSection anomalies={overview.anomalies} />

			<section aria-labelledby="invoice-counters-heading" aria-live="polite" className="space-y-4">
				<h2 id="invoice-counters-heading" className="text-foreground text-lg font-medium">
					Factures
				</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<CounterCard
						icon={<ReceiptIcon className="text-success size-5" aria-hidden="true" />}
						label="Émises"
						value={overview.invoiceCounters.GENERATED}
						hint="Numéro F-YYYY-NNNNN attribué (Art. 286 CGI)"
						href="/admin/ventes/commandes?filter_invoiceStatus=GENERATED"
					/>
					<CounterCard
						icon={<FileXIcon className="text-warning size-5" aria-hidden="true" />}
						label="Annulées (avoir)"
						value={overview.invoiceCounters.VOIDED}
						hint="VOIDED + avoir A-YYYY-NNNNN émis (Art. 272-I CGI)"
						href="/admin/ventes/commandes?filter_invoiceStatus=VOIDED"
					/>
					<CounterCard
						icon={
							<WarningIcon
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
