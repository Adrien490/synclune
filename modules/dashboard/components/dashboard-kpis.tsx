"use client";

import { use } from "react";
import { GetDashboardKpisReturn } from "@/modules/dashboard/types";
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
				value={`${(kpis.todayRevenue.amount / 100).toFixed(2)} €`}
				evolution={kpis.todayRevenue.evolution}
				subtitle="vs hier"
				icon={<Euro className="h-4 w-4" />}
			/>
			<KpiCard
				title="CA du mois"
				value={`${(kpis.monthlyRevenue.amount / 100).toFixed(2)} €`}
				evolution={kpis.monthlyRevenue.evolution}
				subtitle="vs mois dernier"
				icon={<TrendingUp className="h-4 w-4" />}
			/>
			<KpiCard
				title="Panier moyen"
				value={`${(kpis.averageOrderValue.amount / 100).toFixed(2)} €`}
				evolution={kpis.averageOrderValue.evolution}
				subtitle="vs mois dernier"
				icon={<ShoppingCart className="h-4 w-4" />}
			/>
			<KpiCard
				title="Commandes du mois"
				value={kpis.monthlyOrders.count}
				evolution={kpis.monthlyOrders.evolution}
				subtitle="vs mois dernier"
				icon={<ShoppingCart className="h-4 w-4" />}
			/>
			<KpiCard
				title="Commandes en traitement"
				value={kpis.pendingOrders.count}
				subtitle={kpis.pendingOrders.urgentCount > 0 ? `dont ${kpis.pendingOrders.urgentCount} urgente(s)` : "Tout à jour"}
				icon={<Clock className="h-4 w-4" />}
			/>
			<KpiCard
				title="Bijoux en rupture"
				value={kpis.outOfStock.count}
				icon={<PackageX className="h-4 w-4" />}
			/>
		</div>
	);
}
