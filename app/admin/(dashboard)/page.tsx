import { PageHeader } from "@/shared/components/page-header";
import { Suspense } from "react";
import { type Metadata } from "next";
import * as Sentry from "@sentry/nextjs";

import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { DashboardAlerts } from "@/modules/dashboard/components/dashboard-alerts";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import { LazyRevenueChart } from "@/modules/dashboard/components/revenue-chart-lazy";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { RefreshDashboardButton } from "@/modules/dashboard/components/refresh-dashboard-button";
import { PeriodSelector } from "@/modules/dashboard/components/period-selector";

import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";

import { fetchDashboardRevenueChart } from "@/modules/dashboard/data/get-revenue-chart";
import { fetchDashboardRecentOrders } from "@/modules/dashboard/data/get-recent-orders";
import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import { fetchDashboardAlerts } from "@/modules/dashboard/data/get-alerts";

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

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
	const params = await searchParams;
	const period = parsePeriod(params.period);
	const comparisonMode = parseComparisonMode(params.comparison);

	return (
		<section aria-label="Tableau de bord">
			<PageHeader
				variant="compact"
				title="Tableau de bord"
				className="hidden md:block"
				actions={
					<div className="flex items-center gap-2">
						<PeriodSelector />
						<RefreshDashboardButton />
					</div>
				}
			/>

			<div className="space-y-8">
				<Suspense>
					<AlertsWrapper />
				</Suspense>

				<section aria-labelledby="dashboard-section-performance" className="space-y-4">
					<SectionHeading id="dashboard-section-performance" label="Performance ventes" />
					<Suspense
						fallback={
							<KpisSkeleton count={4} compactCount={4} ariaLabel="Chargement des indicateurs" />
						}
					>
						<KpisWrapper period={period} comparisonMode={comparisonMode} />
					</Suspense>
				</section>

				<section aria-labelledby="dashboard-section-trends" className="space-y-4">
					<SectionHeading id="dashboard-section-trends" label="Tendances" />
					<Suspense
						fallback={
							<ChartSkeleton
								heightClassName="h-60 sm:h-72 md:h-75"
								ariaLabel="Chargement du graphique des revenus"
							/>
						}
					>
						<RevenueChartWrapper period={period} />
					</Suspense>
				</section>

				<section aria-labelledby="dashboard-section-activity" className="space-y-4">
					<SectionHeading id="dashboard-section-activity" label="Commandes récentes" />
					<Suspense
						fallback={<ListSkeleton itemCount={5} ariaLabel="Chargement des commandes recentes" />}
					>
						<RecentOrdersWrapper />
					</Suspense>
				</section>
			</div>
		</section>
	);
}

function SectionHeading({ id, label }: { id: string; label: string }) {
	return (
		<h2 id={id} className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
			{label}
		</h2>
	);
}

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

	return <DashboardKpis kpis={kpis} comparisonLabel={getComparisonLabel(period, comparisonMode)} />;
}

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
