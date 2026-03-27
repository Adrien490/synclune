import { PageHeader } from "@/shared/components/page-header";
import { Suspense } from "react";
import { type Metadata } from "next";

import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { DashboardAlerts } from "@/modules/dashboard/components/dashboard-alerts";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import { LazyRevenueChart } from "@/modules/dashboard/components/revenue-chart-lazy";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";

import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";

import { fetchDashboardRevenueChart } from "@/modules/dashboard/data/get-revenue-chart";
import { fetchDashboardRecentOrders } from "@/modules/dashboard/data/get-recent-orders";
import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import { fetchDashboardAlerts } from "@/modules/dashboard/data/get-alerts";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration",
	description: "Vue d'ensemble de votre boutique",
};

/**
 * Dashboard admin - KPIs, alertes, graphique revenus + commandes recentes
 * Chaque widget est isole : une erreur dans un widget n'affecte pas les autres
 */
export default async function AdminDashboardPage() {
	return (
		<>
			<PageHeader variant="compact" title="Tableau de bord" className="hidden md:block" />

			<div className="space-y-6">
				{/* KPIs en grille (4 featured + 1 compact) */}
				<Suspense fallback={<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs" />}>
					<KpisWrapper />
				</Suspense>

				{/* Alertes actionnables (ne rend rien si tout est ok) */}
				<Suspense>
					<AlertsWrapper />
				</Suspense>

				{/* Graphique revenus 30j + Commandes recentes */}
				<div className="grid gap-6 lg:grid-cols-2">
					<Suspense
						fallback={
							<ChartSkeleton height={300} ariaLabel="Chargement du graphique des revenus" />
						}
					>
						<RevenueChartWrapper />
					</Suspense>

					<Suspense
						fallback={<ListSkeleton itemCount={5} ariaLabel="Chargement des commandes recentes" />}
					>
						<RecentOrdersWrapper />
					</Suspense>
				</div>
			</div>
		</>
	);
}

/**
 * Wrapper async pour les KPIs avec gestion d'erreur isolee
 */
async function KpisWrapper() {
	let kpis;
	try {
		kpis = await fetchDashboardKpis();
	} catch {
		return (
			<ChartError
				title="Erreur de chargement"
				description="Impossible de charger les indicateurs."
				minHeight={140}
			/>
		);
	}
	return <DashboardKpis kpis={kpis} />;
}

/**
 * Wrapper async pour les alertes - silencieux en cas d'erreur
 * (les alertes sont optionnelles, pas critique si elles echouent)
 */
async function AlertsWrapper() {
	let alerts;
	try {
		alerts = await fetchDashboardAlerts();
	} catch {
		return null;
	}
	return <DashboardAlerts alerts={alerts} />;
}

/**
 * Wrapper async pour le graphique des revenus avec gestion d'erreur isolee
 */
async function RevenueChartWrapper() {
	let chartData;
	try {
		chartData = await fetchDashboardRevenueChart();
	} catch {
		return (
			<ChartError
				title="Erreur de chargement"
				description="Impossible de charger le graphique des revenus."
			/>
		);
	}
	return <LazyRevenueChart chartData={chartData} />;
}

/**
 * Wrapper async pour les commandes recentes avec gestion d'erreur isolee
 */
async function RecentOrdersWrapper() {
	let listData;
	try {
		listData = await fetchDashboardRecentOrders();
	} catch {
		return (
			<ChartError
				title="Erreur de chargement"
				description="Impossible de charger les commandes recentes."
			/>
		);
	}
	return <RecentOrdersList listData={listData} />;
}
