import { Crown, Repeat, UserPlus } from "lucide-react";
import type { GetCustomerKpisReturn } from "@/modules/dashboard/data/get-customer-kpis";
import { formatEuro } from "@/shared/utils/format-euro";
import { KpiCard } from "./kpi-card";
import { KpiCardAnimated } from "./kpi-card-animated";

interface CustomerKpisProps {
	kpis: GetCustomerKpisReturn;
	comparisonLabel?: string;
}

/**
 * Customer-focused KPIs row: new customers, returning rate, top spender
 * Uses staggered animation continuing the index sequence after DashboardKpis (4+4=8 cards).
 */
export function CustomerKpis({ kpis, comparisonLabel = "vs mois dernier" }: CustomerKpisProps) {
	const topSpender = kpis.topSpender;
	const topSpenderValue = topSpender ? formatEuro(topSpender.totalSpent, { compact: true }) : "—";
	const topSpenderSubtitle = topSpender
		? `${topSpender.customerName} · ${topSpender.orderCount} cmd${topSpender.orderCount > 1 ? "s" : ""}`
		: "Aucune commande";

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<KpiCardAnimated index={0}>
				<KpiCard
					title="Nouveaux clients"
					value={kpis.newCustomers.count.toString()}
					numericValue={kpis.newCustomers.count}
					evolution={kpis.newCustomers.evolution}
					comparisonLabel={comparisonLabel}
					icon={<UserPlus className="h-4 w-4" />}
					size="compact"
					priority="info"
					href="/admin/clients"
					tooltip="Comptes clients créés sur la période (hors comptes anonymisés)"
				/>
			</KpiCardAnimated>

			<KpiCardAnimated index={1}>
				<KpiCard
					title="Clients récurrents"
					value={
						kpis.returningRate.totalActiveCustomers > 0
							? `${kpis.returningRate.rate.toFixed(1)} %`
							: "—"
					}
					numericValue={kpis.returningRate.rate}
					suffix=" %"
					decimalPlaces={1}
					evolution={
						kpis.returningRate.totalActiveCustomers > 0 ? kpis.returningRate.evolution : undefined
					}
					comparisonLabel={comparisonLabel}
					icon={<Repeat className="h-4 w-4" />}
					size="compact"
					priority="operational"
					tooltip="Part des clients ayant déjà commandé avant cette période parmi les clients actifs sur la période"
					subtitle={
						kpis.returningRate.totalActiveCustomers > 0
							? `${kpis.returningRate.returningCount} / ${kpis.returningRate.totalActiveCustomers} clients`
							: undefined
					}
				/>
			</KpiCardAnimated>

			<KpiCardAnimated index={2}>
				<KpiCard
					title="Meilleur client"
					value={topSpenderValue}
					numericValue={topSpender?.totalSpent ?? 0}
					suffix=" €"
					icon={<Crown className="h-4 w-4" />}
					size="compact"
					priority="info"
					href={
						topSpender
							? `/admin/clients?search=${encodeURIComponent(topSpender.customerEmail)}`
							: undefined
					}
					tooltip="Client ayant dépensé le plus sur la période"
					subtitle={topSpenderSubtitle}
				/>
			</KpiCardAnimated>
		</div>
	);
}
