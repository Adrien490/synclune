import { PageHeader } from "@/shared/components/page-header";
import { Suspense } from "react";
import { type Metadata } from "next";
import * as Sentry from "@sentry/nextjs";

import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { DashboardAlerts } from "@/modules/dashboard/components/dashboard-alerts";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import { FulfillmentPipelineCard } from "@/modules/dashboard/components/fulfillment-pipeline";
import { LazyRevenueChart } from "@/modules/dashboard/components/revenue-chart-lazy";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { RefreshDashboardButton } from "@/modules/dashboard/components/refresh-dashboard-button";
import { TopProductsList } from "@/modules/dashboard/components/top-products-list";
import { ActiveDiscounts } from "@/modules/dashboard/components/active-discounts";

import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
	FulfillmentSkeleton,
} from "@/modules/dashboard/components/skeletons";

import { fetchDashboardRevenueChart } from "@/modules/dashboard/data/get-revenue-chart";
import { fetchDashboardRecentOrders } from "@/modules/dashboard/data/get-recent-orders";
import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import { fetchKpiSparklines } from "@/modules/dashboard/data/get-kpi-sparklines";
import { fetchDashboardAlerts } from "@/modules/dashboard/data/get-alerts";
import { fetchFulfillmentPipeline } from "@/modules/dashboard/data/get-fulfillment-pipeline";
import { fetchTopProducts } from "@/modules/dashboard/data/get-top-products";
import { fetchActiveDiscounts } from "@/modules/dashboard/data/get-active-discounts";

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
			<PageHeader
				variant="compact"
				title="Tableau de bord"
				className="hidden md:block"
				actions={<RefreshDashboardButton />}
			/>

			<div className="space-y-6">
				{/* KPIs en grille (4 featured + 1 compact) */}
				<Suspense
					fallback={
						<KpisSkeleton count={4} compactCount={4} ariaLabel="Chargement des indicateurs" />
					}
				>
					<KpisWrapper />
				</Suspense>

				{/* Alertes actionnables (ne rend rien si tout est ok) */}
				<Suspense>
					<AlertsWrapper />
				</Suspense>

				{/* Pipeline d'expedition */}
				<Suspense fallback={<FulfillmentSkeleton />}>
					<FulfillmentWrapper />
				</Suspense>

				{/* Graphique revenus 30j */}
				<Suspense
					fallback={<ChartSkeleton height={300} ariaLabel="Chargement du graphique des revenus" />}
				>
					<RevenueChartWrapper />
				</Suspense>

				{/* Commandes recentes + Top produits + Codes promo */}
				<div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
					<Suspense
						fallback={<ListSkeleton itemCount={5} ariaLabel="Chargement des commandes recentes" />}
					>
						<RecentOrdersWrapper />
					</Suspense>

					<Suspense
						fallback={<ListSkeleton itemCount={5} ariaLabel="Chargement des top produits" />}
					>
						<TopProductsWrapper />
					</Suspense>

					<Suspense>
						<ActiveDiscountsWrapper />
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
	} catch (error) {
		Sentry.captureException(error);
		return (
			<ChartError
				title="Erreur de chargement"
				description="Impossible de charger les indicateurs."
				minHeight={140}
			/>
		);
	}

	// Sparklines are non-critical — load in parallel but don't block on failure
	let sparklines;
	try {
		sparklines = await fetchKpiSparklines();
	} catch {
		sparklines = undefined;
	}

	return <DashboardKpis kpis={kpis} sparklines={sparklines} />;
}

/**
 * Wrapper async pour les alertes - silencieux en cas d'erreur
 * (les alertes sont optionnelles, pas critique si elles echouent)
 */
async function AlertsWrapper() {
	let alerts;
	try {
		alerts = await fetchDashboardAlerts();
	} catch (error) {
		Sentry.captureException(error);
		return null;
	}
	return <DashboardAlerts alerts={alerts} />;
}

/**
 * Wrapper async pour le pipeline d'expedition - silencieux en cas d'erreur
 */
async function FulfillmentWrapper() {
	let pipeline;
	try {
		pipeline = await fetchFulfillmentPipeline();
	} catch (error) {
		Sentry.captureException(error);
		return null;
	}
	return <FulfillmentPipelineCard pipeline={pipeline} />;
}

/**
 * Wrapper async pour le graphique des revenus avec gestion d'erreur isolee
 */
async function RevenueChartWrapper() {
	let chartData;
	try {
		chartData = await fetchDashboardRevenueChart();
	} catch (error) {
		Sentry.captureException(error);
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
 * Wrapper async pour les top produits - silencieux en cas d'erreur
 */
async function TopProductsWrapper() {
	let data;
	try {
		data = await fetchTopProducts();
	} catch (error) {
		Sentry.captureException(error);
		return (
			<ChartError
				title="Erreur de chargement"
				description="Impossible de charger les top produits."
			/>
		);
	}
	return <TopProductsList data={data} />;
}

/**
 * Wrapper async pour les codes promo actifs - silencieux en cas d'erreur
 */
async function ActiveDiscountsWrapper() {
	let data;
	try {
		data = await fetchActiveDiscounts();
	} catch (error) {
		Sentry.captureException(error);
		return null;
	}
	return <ActiveDiscounts data={data} />;
}

/**
 * Wrapper async pour les commandes recentes avec gestion d'erreur isolee
 */
async function RecentOrdersWrapper() {
	let listData;
	try {
		listData = await fetchDashboardRecentOrders();
	} catch (error) {
		Sentry.captureException(error);
		return (
			<ChartError
				title="Erreur de chargement"
				description="Impossible de charger les commandes recentes."
			/>
		);
	}
	return <RecentOrdersList listData={listData} />;
}
