import { PageHeader } from "@/shared/components/page-header";
import { Suspense } from "react";
import { Metadata } from "next";
import { connection } from "next/server";

import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { RevenueChart } from "@/modules/dashboard/components/revenue-chart";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";

import { fetchDashboardRevenueChart } from "@/modules/dashboard/data/get-revenue-chart";
import { fetchDashboardRecentOrders } from "@/modules/dashboard/data/get-recent-orders";

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
