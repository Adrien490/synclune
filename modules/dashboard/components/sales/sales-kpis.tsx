"use client";

import { use } from "react";
import { Euro, ShoppingCart, TrendingUp, Percent } from "lucide-react";
import { KpiCard } from "../kpi-card";
import type { SalesKpisReturn } from "../../types/dashboard.types";

interface SalesKpisProps {
	kpisPromise: Promise<SalesKpisReturn>;
}

/**
 * KPIs de la section Ventes
 */
export function SalesKpis({ kpisPromise }: SalesKpisProps) {
	const kpis = use(kpisPromise);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<KpiCard
				title="Chiffre d'affaires"
				value={`${(kpis.revenue.amount / 100).toFixed(2)} €`}
				evolution={kpis.revenue.evolution}
				subtitle="vs periode precedente"
				icon={<Euro className="h-4 w-4" />}
			/>
			<KpiCard
				title="Commandes"
				value={kpis.ordersCount.count}
				evolution={kpis.ordersCount.evolution}
				subtitle="vs periode precedente"
				icon={<ShoppingCart className="h-4 w-4" />}
			/>
			<KpiCard
				title="Panier moyen"
				value={`${(kpis.averageOrderValue.amount / 100).toFixed(2)} €`}
				evolution={kpis.averageOrderValue.evolution}
				subtitle="vs periode precedente"
				icon={<TrendingUp className="h-4 w-4" />}
			/>
			<KpiCard
				title="Taux de conversion"
				value={`${kpis.conversionRate.rate.toFixed(1)} %`}
				evolution={kpis.conversionRate.evolution}
				subtitle="panier → commande"
				icon={<Percent className="h-4 w-4" />}
			/>
		</div>
	);
}
