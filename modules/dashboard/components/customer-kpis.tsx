"use client";

import { Crown, Repeat, UserPlus } from "lucide-react";
import type { GetCustomerKpisReturn } from "@/modules/dashboard/data/get-customer-kpis";
import { ItemGroup, ItemSeparator } from "@/shared/components/ui/item";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { formatEuro } from "@/shared/utils/format-euro";
import { KpiCard } from "./kpi-card";
import { KpiCardAnimated } from "./kpi-card-animated";
import { StatRow } from "./stat-row";

interface CustomerKpisProps {
	kpis: GetCustomerKpisReturn;
	comparisonLabel?: string;
}

/**
 * Customer-focused KPIs row: new customers, returning rate, top spender
 * Mobile: dense ItemGroup with StatRows. Desktop: 3-col grid of KpiCards with staggered animation.
 */
export function CustomerKpis({ kpis, comparisonLabel = "vs mois dernier" }: CustomerKpisProps) {
	const topSpender = kpis.topSpender;
	const topSpenderValue = topSpender ? formatEuro(topSpender.totalSpent, { compact: true }) : "—";
	const topSpenderSubtitle = topSpender
		? `${topSpender.customerName} · ${topSpender.orderCount} cmd${topSpender.orderCount > 1 ? "s" : ""}`
		: "Aucune commande";
	const hasReturningRate = kpis.returningRate.totalActiveCustomers > 0;
	const isMobile = useIsMobile();

	if (isMobile) {
		return (
			<ItemGroup aria-label="Indicateurs clients">
				<StatRow
					icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
					label="Nouveaux clients"
					value={kpis.newCustomers.count.toString()}
					evolution={kpis.newCustomers.evolution}
					comparisonLabel={comparisonLabel}
					href="/admin/clients"
				/>
				<ItemSeparator />
				<StatRow
					icon={<Repeat className="h-4 w-4" aria-hidden="true" />}
					label="Clients récurrents"
					subtitle={
						hasReturningRate
							? `${kpis.returningRate.returningCount} / ${kpis.returningRate.totalActiveCustomers} clients`
							: undefined
					}
					value={hasReturningRate ? `${kpis.returningRate.rate.toFixed(1)} %` : "—"}
					evolution={hasReturningRate ? kpis.returningRate.evolution : undefined}
					comparisonLabel={comparisonLabel}
				/>
				<ItemSeparator />
				<StatRow
					icon={<Crown className="h-4 w-4" aria-hidden="true" />}
					label="Meilleur client"
					subtitle={topSpenderSubtitle}
					value={topSpenderValue}
					href={
						topSpender
							? `/admin/clients?search=${encodeURIComponent(topSpender.customerEmail)}`
							: undefined
					}
				/>
			</ItemGroup>
		);
	}

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
					value={hasReturningRate ? `${kpis.returningRate.rate.toFixed(1)} %` : "—"}
					numericValue={kpis.returningRate.rate}
					suffix=" %"
					decimalPlaces={1}
					evolution={hasReturningRate ? kpis.returningRate.evolution : undefined}
					comparisonLabel={comparisonLabel}
					icon={<Repeat className="h-4 w-4" />}
					size="compact"
					priority="operational"
					tooltip="Part des clients ayant déjà commandé avant cette période parmi les clients actifs sur la période"
					subtitle={
						hasReturningRate
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
