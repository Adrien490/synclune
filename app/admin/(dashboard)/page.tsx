import { PageHeader } from "@/shared/components/page-header";
import { Suspense } from "react";
import { type Metadata } from "next";
import * as Sentry from "@sentry/nextjs";

import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { CustomerKpis } from "@/modules/dashboard/components/customer-kpis";
import { CartAbandonmentCard } from "@/modules/dashboard/components/cart-abandonment-card";
import { SalesHeatmap } from "@/modules/dashboard/components/sales-heatmap";
import { ComparisonModeSelector } from "@/modules/dashboard/components/comparison-mode-selector";
import { DashboardMobileHeader } from "@/modules/dashboard/components/dashboard-mobile-header";
import { DashboardAlerts } from "@/modules/dashboard/components/dashboard-alerts";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import { FulfillmentPipelineCard } from "@/modules/dashboard/components/fulfillment-pipeline";
import { LazyRevenueChart } from "@/modules/dashboard/components/revenue-chart-lazy";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { RefreshDashboardButton } from "@/modules/dashboard/components/refresh-dashboard-button";
import { ExportDashboardButton } from "@/modules/dashboard/components/export-dashboard-button";
import { PeriodSelector } from "@/modules/dashboard/components/period-selector";
import { TopProductsList } from "@/modules/dashboard/components/top-products-list";
import { ActiveDiscounts } from "@/modules/dashboard/components/active-discounts";
import { DashboardListsTabs } from "@/modules/dashboard/components/dashboard-lists-tabs";

import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
	FulfillmentSkeleton,
} from "@/modules/dashboard/components/skeletons";

import { fetchDashboardRevenueChart } from "@/modules/dashboard/data/get-revenue-chart";
import { fetchDashboardRecentOrders } from "@/modules/dashboard/data/get-recent-orders";
import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import { fetchCustomerKpis } from "@/modules/dashboard/data/get-customer-kpis";
import { fetchCartAbandonment } from "@/modules/dashboard/data/get-cart-abandonment";
import { fetchSalesHeatmap } from "@/modules/dashboard/data/get-sales-heatmap";
import { fetchKpiSparklines } from "@/modules/dashboard/data/get-kpi-sparklines";
import { fetchDashboardAlerts } from "@/modules/dashboard/data/get-alerts";
import { fetchFulfillmentPipeline } from "@/modules/dashboard/data/get-fulfillment-pipeline";
import { fetchTopProducts } from "@/modules/dashboard/data/get-top-products";
import { fetchActiveDiscounts } from "@/modules/dashboard/data/get-active-discounts";

import {
	getComparisonLabel,
	parseComparisonMode,
	parsePeriod,
} from "@/modules/dashboard/constants/period.constants";
import type {
	ComparisonMode,
	DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration",
	description: "Vue d'ensemble de votre boutique",
};

type AdminDashboardPageProps = {
	searchParams: Promise<{ period?: string; comparison?: string }>;
};

/**
 * Dashboard admin - KPIs, alertes, graphique revenus + commandes recentes
 * Chaque widget est isole : une erreur dans un widget n'affecte pas les autres
 */
export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
	const params = await searchParams;
	const period = parsePeriod(params.period);
	const comparisonMode = parseComparisonMode(params.comparison);

	return (
		<section aria-label="Tableau de bord">
			<DashboardMobileHeader className="mb-6 md:hidden" />
			<PageHeader
				variant="compact"
				title="Tableau de bord"
				className="hidden md:block"
				actions={
					<div className="flex items-center gap-2">
						<PeriodSelector />
						<ComparisonModeSelector />
						<ExportDashboardButton />
						<RefreshDashboardButton />
					</div>
				}
			/>

			<div className="space-y-6">
				{/* KPIs en grille (4 featured + 4 compact) */}
				<Suspense
					fallback={
						<KpisSkeleton count={4} compactCount={4} ariaLabel="Chargement des indicateurs" />
					}
				>
					<KpisWrapper period={period} comparisonMode={comparisonMode} />
				</Suspense>

				{/* KPIs clients (nouveaux, recurrents, meilleur client) */}
				<Suspense
					fallback={
						<KpisSkeleton count={0} compactCount={3} ariaLabel="Chargement des KPIs clients" />
					}
				>
					<CustomerKpisWrapper period={period} comparisonMode={comparisonMode} />
				</Suspense>

				{/* Alertes actionnables (ne rend rien si tout est ok) */}
				<Suspense>
					<AlertsWrapper />
				</Suspense>

				{/* Pipeline d'expedition */}
				<Suspense fallback={<FulfillmentSkeleton />}>
					<FulfillmentWrapper />
				</Suspense>

				{/* Paniers abandonnes & taux de recuperation */}
				<Suspense
					fallback={<ChartSkeleton height={180} ariaLabel="Chargement des paniers abandonnés" />}
				>
					<CartAbandonmentWrapper period={period} comparisonMode={comparisonMode} />
				</Suspense>

				{/* Graphique revenus */}
				<Suspense
					fallback={<ChartSkeleton height={300} ariaLabel="Chargement du graphique des revenus" />}
				>
					<RevenueChartWrapper period={period} />
				</Suspense>

				{/* Heatmap d'activite (jour x heure) */}
				<Suspense
					fallback={<ChartSkeleton height={260} ariaLabel="Chargement de la heatmap d'activité" />}
				>
					<SalesHeatmapWrapper period={period} />
				</Suspense>

				{/* Commandes recentes + Top produits + Codes promo */}
				<DashboardListsTabs
					ordersSlot={
						<Suspense
							fallback={
								<ListSkeleton itemCount={5} ariaLabel="Chargement des commandes recentes" />
							}
						>
							<RecentOrdersWrapper />
						</Suspense>
					}
					productsSlot={
						<Suspense
							fallback={<ListSkeleton itemCount={5} ariaLabel="Chargement des top produits" />}
						>
							<TopProductsWrapper period={period} />
						</Suspense>
					}
					discountsSlot={
						<Suspense>
							<ActiveDiscountsWrapper />
						</Suspense>
					}
				/>
			</div>
		</section>
	);
}

/**
 * Wrapper async pour les KPIs avec gestion d'erreur isolee
 */
async function KpisWrapper({
	period,
	comparisonMode,
}: {
	period: DashboardPeriod;
	comparisonMode: ComparisonMode;
}) {
	let kpis;
	try {
		kpis = await fetchDashboardKpis(period, comparisonMode);
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
		sparklines = await fetchKpiSparklines(period);
	} catch {
		sparklines = undefined;
	}

	return (
		<DashboardKpis
			kpis={kpis}
			sparklines={sparklines}
			comparisonLabel={getComparisonLabel(period, comparisonMode)}
		/>
	);
}

/**
 * Wrapper async pour les KPIs clients - silencieux en cas d'erreur
 * (KPIs secondaires, ne doivent pas bloquer le rendu du dashboard)
 */
async function CustomerKpisWrapper({
	period,
	comparisonMode,
}: {
	period: DashboardPeriod;
	comparisonMode: ComparisonMode;
}) {
	let kpis;
	try {
		kpis = await fetchCustomerKpis(period);
	} catch (error) {
		Sentry.captureException(error);
		return null;
	}
	return <CustomerKpis kpis={kpis} comparisonLabel={getComparisonLabel(period, comparisonMode)} />;
}

/**
 * Wrapper async pour les paniers abandonnes - silencieux en cas d'erreur
 */
async function CartAbandonmentWrapper({
	period,
	comparisonMode,
}: {
	period: DashboardPeriod;
	comparisonMode: ComparisonMode;
}) {
	let data;
	try {
		data = await fetchCartAbandonment(period);
	} catch (error) {
		Sentry.captureException(error);
		return null;
	}
	return (
		<CartAbandonmentCard data={data} comparisonLabel={getComparisonLabel(period, comparisonMode)} />
	);
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
async function RevenueChartWrapper({ period }: { period: DashboardPeriod }) {
	let chartData;
	try {
		chartData = await fetchDashboardRevenueChart(period);
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
 * Wrapper async pour la heatmap d'activite - silencieux en cas d'erreur
 */
async function SalesHeatmapWrapper({ period }: { period: DashboardPeriod }) {
	let data;
	try {
		data = await fetchSalesHeatmap(period);
	} catch (error) {
		Sentry.captureException(error);
		return null;
	}
	return <SalesHeatmap data={data} />;
}

/**
 * Wrapper async pour les top produits
 */
async function TopProductsWrapper({ period }: { period: DashboardPeriod }) {
	let data;
	try {
		data = await fetchTopProducts(period);
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
