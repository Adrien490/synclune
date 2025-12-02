"use client";

import { use } from "react";
import type { GetDashboardKpisReturn } from "@/modules/dashboard/data/get-kpis";
import { KpiCard } from "./kpi-card";
import { Euro, PackageX, Clock, TrendingUp, ShoppingCart } from "lucide-react";

interface DashboardKpisProps {
	kpisPromise: Promise<GetDashboardKpisReturn>;
}

/**
 * KPIs essentiels pour une micro-entreprise
 * ℹ️ TVA retirée car exonérée (art. 293 B du CGI)
 */
export function DashboardKpis({ kpisPromise }: DashboardKpisProps) {
	const kpis = use(kpisPromise);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<KpiCard
				title="CA du jour"
				value=""
				numericValue={kpis.todayRevenue.amount / 100}
				suffix=" €"
				decimalPlaces={2}
				evolution={kpis.todayRevenue.evolution}
				subtitle="vs hier"
				icon={<Euro className="h-4 w-4" />}
				priority="critical"
			/>
			<KpiCard
				title="CA du mois"
				value=""
				numericValue={kpis.monthlyRevenue.amount / 100}
				suffix=" €"
				decimalPlaces={2}
				evolution={kpis.monthlyRevenue.evolution}
				subtitle="vs mois dernier"
				icon={<TrendingUp className="h-4 w-4" />}
				size="featured"
				priority="critical"
			/>
			<KpiCard
				title="Panier moyen"
				value=""
				numericValue={kpis.averageOrderValue.amount / 100}
				suffix=" €"
				decimalPlaces={2}
				evolution={kpis.averageOrderValue.evolution}
				subtitle="vs mois dernier"
				icon={<ShoppingCart className="h-4 w-4" />}
				priority="operational"
			/>
			<KpiCard
				title="Commandes du mois"
				value=""
				numericValue={kpis.monthlyOrders.count}
				evolution={kpis.monthlyOrders.evolution}
				subtitle="vs mois dernier"
				icon={<ShoppingCart className="h-4 w-4" />}
				size="featured"
				priority="critical"
			/>
			<KpiCard
				title="Commandes en traitement"
				value=""
				numericValue={kpis.pendingOrders.count}
				subtitle={kpis.pendingOrders.urgentCount > 0 ? `dont ${kpis.pendingOrders.urgentCount} urgente(s)` : "Tout à jour"}
				icon={<Clock className="h-4 w-4" />}
				priority="operational"
				status={kpis.pendingOrders.urgentCount > 0 ? "warning" : "default"}
			/>
			<KpiCard
				title="Bijoux en rupture"
				value=""
				numericValue={kpis.outOfStock.count}
				icon={<PackageX className="h-4 w-4" />}
				size="compact"
				priority="alert"
				status={kpis.outOfStock.count > 0 ? "danger" : "default"}
			/>
		</div>
	);
}
