import { PageHeader } from "@/shared/components/page-header";
import { Suspense } from "react";
import { Metadata } from "next";
import { connection } from "next/server";

import { KpiCard } from "@/modules/dashboard/components/kpi-card";
import { RevenueChart } from "@/modules/dashboard/components/revenue-chart";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";

import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import { fetchDashboardRevenueChart } from "@/modules/dashboard/data/get-revenue-chart";
import { fetchDashboardRecentOrders } from "@/modules/dashboard/data/get-recent-orders";

import { Euro, ShoppingBag, Receipt } from "lucide-react";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration",
	description: "Vue d'ensemble de votre boutique",
};

/**
 * Dashboard simplifié - 6 KPIs + graphique + commandes récentes
 */
export default async function AdminDashboardPage() {
	await connection();

	return (
		<>
			<PageHeader variant="compact" title="Tableau de bord" />

			<div className="space-y-6">
				{/* 3 KPIs en grille */}
				<ErrorBoundary
					fallback={
						<ChartError
							title="Erreur de chargement"
							description="Impossible de charger les indicateurs"
							minHeight={120}
						/>
					}
				>
					<Suspense
						fallback={
							<KpisSkeleton
								count={3}
								ariaLabel="Chargement des indicateurs"
							/>
						}
					>
						<DashboardKpis />
					</Suspense>
				</ErrorBoundary>

				{/* Graphique revenus 30j + Commandes récentes */}
				<div className="grid gap-6 lg:grid-cols-2">
					<ErrorBoundary
						fallback={
							<ChartError
								title="Erreur de chargement"
								description="Impossible de charger le graphique"
								minHeight={300}
							/>
						}
					>
						<Suspense
							fallback={
								<ChartSkeleton
									height={300}
									ariaLabel="Chargement du graphique des revenus"
								/>
							}
						>
							<RevenueChartWrapper />
						</Suspense>
					</ErrorBoundary>

					<ErrorBoundary
						fallback={
							<ChartError
								title="Erreur de chargement"
								description="Impossible de charger les commandes"
								minHeight={300}
							/>
						}
					>
						<Suspense
							fallback={
								<ListSkeleton
									itemCount={5}
									ariaLabel="Chargement des commandes récentes"
								/>
							}
						>
							<RecentOrdersWrapper />
						</Suspense>
					</ErrorBoundary>
				</div>
			</div>
		</>
	);
}

/**
 * Composant async pour les 3 KPIs
 */
async function DashboardKpis() {
	const kpis = await fetchDashboardKpis();

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
			maximumFractionDigits: 0,
		}).format(amount);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{/* CA du mois */}
			<KpiCard
				title="CA du mois"
				value={formatCurrency(kpis.monthlyRevenue.amount)}
				numericValue={kpis.monthlyRevenue.amount}
				suffix=" €"
				evolution={kpis.monthlyRevenue.evolution}
				comparisonLabel="vs mois dernier"
				icon={<Euro className="h-4 w-4" />}
				size="featured"
				priority="critical"
				href="/admin/ventes/commandes?paymentStatus=PAID"
				tooltip="Chiffre d'affaires total des commandes payées ce mois"
			/>

			{/* Commandes du mois */}
			<KpiCard
				title="Commandes"
				value={kpis.monthlyOrders.count.toString()}
				numericValue={kpis.monthlyOrders.count}
				evolution={kpis.monthlyOrders.evolution}
				comparisonLabel="vs mois dernier"
				icon={<ShoppingBag className="h-4 w-4" />}
				size="featured"
				priority="critical"
				href="/admin/ventes/commandes"
				tooltip="Nombre de commandes payées ce mois"
			/>

			{/* Panier moyen */}
			<KpiCard
				title="Panier moyen"
				value={formatCurrency(kpis.averageOrderValue.amount)}
				numericValue={kpis.averageOrderValue.amount}
				suffix=" €"
				evolution={kpis.averageOrderValue.evolution}
				comparisonLabel="vs mois dernier"
				icon={<Receipt className="h-4 w-4" />}
				size="featured"
				priority="operational"
				tooltip="Valeur moyenne des commandes ce mois"
			/>
		</div>
	);
}

/**
 * Wrapper async pour le graphique des revenus
 */
async function RevenueChartWrapper() {
	const chartDataPromise = fetchDashboardRevenueChart();
	return <RevenueChart chartDataPromise={chartDataPromise} />;
}

/**
 * Wrapper async pour les commandes récentes
 */
async function RecentOrdersWrapper() {
	const listDataPromise = fetchDashboardRecentOrders();
	return <RecentOrdersList listDataPromise={listDataPromise} />;
}
