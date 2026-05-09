import { PageHeader } from "@/shared/components/page-header";
import { Suspense } from "react";
import { type Metadata } from "next";
import * as Sentry from "@sentry/nextjs";

import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { DashboardAlerts } from "@/modules/dashboard/components/dashboard-alerts";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import { LazyRevenueChart } from "@/modules/dashboard/components/revenue-chart-lazy";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { TopProductsList } from "@/modules/dashboard/components/top-products-list";
import { RefreshDashboardButton } from "@/modules/dashboard/components/refresh-dashboard-button";
import { PeriodSelector } from "@/modules/dashboard/components/period-selector";
import { ExportRevenueButton } from "@/modules/dashboard/components/export-revenue-button";
import { VatProgressCard } from "@/modules/dashboard/components/vat-progress-card";

import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";

import { fetchDashboardRevenueChart } from "@/modules/dashboard/data/get-revenue-chart";
import { fetchDashboardRecentOrders } from "@/modules/dashboard/data/get-recent-orders";
import { fetchDashboardTopProducts } from "@/modules/dashboard/data/get-top-products";
import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import { fetchDashboardAlerts } from "@/modules/dashboard/data/get-alerts";
import { fetchDashboardReviewHealth } from "@/modules/dashboard/data/get-review-health";
import { fetchDashboardVatProgress } from "@/modules/dashboard/data/get-vat-progress";
import { getNextUrssafDeadline } from "@/modules/dashboard/services/urssaf-deadline.service";

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
				title="Ton atelier"
				description="Voici ce qui se passe aujourd'hui"
				titleClassName="font-cursive text-3xl sm:text-4xl lg:text-5xl tracking-wide"
				actions={
					<div className="flex items-center gap-2">
						<PeriodSelector />
						<ExportRevenueButton period={period} />
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

				<section aria-labelledby="dashboard-section-compliance" className="space-y-4">
					<SectionHeading id="dashboard-section-compliance" label="Conformité fiscale" />
					<Suspense fallback={<VatProgressSkeleton />}>
						<VatProgressWrapper />
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
					<SectionHeading id="dashboard-section-activity" label="Activité" />
					<div className="grid gap-6 lg:grid-cols-2">
						<Suspense
							fallback={
								<ListSkeleton itemCount={5} ariaLabel="Chargement des commandes recentes" />
							}
						>
							<RecentOrdersWrapper />
						</Suspense>
						<Suspense
							fallback={<ListSkeleton itemCount={5} ariaLabel="Chargement du top produits" />}
						>
							<TopProductsWrapper period={period} />
						</Suspense>
					</div>
				</section>
			</div>
		</section>
	);
}

function SectionHeading({ id, label }: { id: string; label: string }) {
	return (
		<h2
			id={id}
			className="text-muted-foreground font-display text-sm font-normal tracking-tight italic"
		>
			{label}
		</h2>
	);
}

function VatProgressSkeleton() {
	return (
		<div
			className="bg-muted/40 h-32 animate-pulse rounded-xl"
			aria-label="Chargement du suivi de seuil TVA"
		/>
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
	let reviewHealth;
	try {
		[kpis, reviewHealth] = await Promise.all([
			fetchDashboardKpis(period, comparisonMode),
			fetchDashboardReviewHealth(),
		]);
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
	return (
		<DashboardKpis
			kpis={kpis}
			reviewHealth={reviewHealth}
			comparisonLabel={getComparisonLabel(period, comparisonMode)}
		/>
	);
}

async function AlertsWrapper() {
	let alerts;
	let vatProgress;
	try {
		[alerts, vatProgress] = await Promise.all([
			fetchDashboardAlerts(),
			fetchDashboardVatProgress().catch((error) => {
				Sentry.captureException(error);
				return null;
			}),
		]);
	} catch (error) {
		Sentry.captureException(error);
		return null;
	}
	const urssafDeadline = getNextUrssafDeadline();
	return (
		<DashboardAlerts alerts={alerts} vatProgress={vatProgress} urssafDeadline={urssafDeadline} />
	);
}

async function VatProgressWrapper() {
	let data;
	try {
		data = await fetchDashboardVatProgress();
	} catch (error) {
		Sentry.captureException(error);
		return (
			<ChartError
				title="Erreur de chargement"
				description="Impossible de charger le suivi du seuil TVA."
				minHeight={120}
			/>
		);
	}
	return <VatProgressCard data={data} />;
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

async function TopProductsWrapper({ period }: { period: DashboardPeriod }) {
	let listData;
	try {
		listData = await fetchDashboardTopProducts(period);
	} catch (error) {
		Sentry.captureException(error);
		return (
			<ChartError
				title="Erreur de chargement"
				description="Impossible de charger le top des produits."
			/>
		);
	}
	return <TopProductsList listData={listData} />;
}
