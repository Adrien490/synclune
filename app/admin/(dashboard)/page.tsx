import { PageHeader } from "@/shared/components/page-header";
import { Suspense } from "react";
import { type Metadata } from "next";
import * as Sentry from "@sentry/nextjs";

import {
	HandDrawnAccent,
	HandDrawnUnderline,
} from "@/shared/components/animations/hand-drawn-accent";

import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { DashboardAlerts } from "@/modules/dashboard/components/dashboard-alerts";
import { DashboardGreeting } from "@/modules/dashboard/components/dashboard-greeting";
import { DashboardAmbientBackground } from "@/modules/dashboard/components/dashboard-ambient-background";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import { LazyRevenueChart } from "@/modules/dashboard/components/revenue-chart-lazy";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { TopProductsList } from "@/modules/dashboard/components/top-products-list";
import { RefreshDashboardButton } from "@/modules/dashboard/components/refresh-dashboard-button";
import { PeriodSelector } from "@/modules/dashboard/components/period-selector";
import { ExportRevenueButton } from "@/modules/dashboard/components/export-revenue-button";
import { DashboardMobileActions } from "@/modules/dashboard/components/dashboard-mobile-actions";
import { DashboardFreshness } from "@/modules/dashboard/components/dashboard-freshness";
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
	DASHBOARD_PERIODS,
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
		<section aria-label="Tableau de bord" className="relative isolate">
			<DashboardAmbientBackground />
			<PageHeader
				variant="compact"
				title="Ton atelier"
				titleClassName="font-cursive text-3xl sm:text-4xl lg:text-5xl tracking-wide"
				actions={
					<>
						<div className="hidden w-full items-center gap-2 md:flex md:w-auto md:justify-end">
							<PeriodSelector />
							<ExportRevenueButton period={period} />
							<RefreshDashboardButton />
						</div>
						<DashboardMobileActions period={period} className="md:hidden" />
					</>
				}
			/>

			<Suspense fallback={<DashboardGreetingFallback />}>
				<DashboardGreeting period={period} comparisonMode={comparisonMode} />
			</Suspense>

			<div className="space-y-8">
				<Suspense>
					<AlertsWrapper />
				</Suspense>

				<DashboardFreshness className="md:hidden" />

				<section aria-labelledby="dashboard-section-performance" className="space-y-4">
					<SectionHeading
						id="dashboard-section-performance"
						label="Performance ventes"
						accent="star"
					/>
					<Suspense
						fallback={
							<KpisSkeleton count={4} compactCount={4} ariaLabel="Chargement des indicateurs" />
						}
					>
						<KpisWrapper period={period} comparisonMode={comparisonMode} />
					</Suspense>
				</section>

				<section aria-labelledby="dashboard-section-compliance" className="space-y-4">
					<SectionHeading
						id="dashboard-section-compliance"
						label="Conformité fiscale"
						accent="circle"
					/>
					<Suspense fallback={<VatProgressSkeleton />}>
						<VatProgressWrapper />
					</Suspense>
				</section>

				<section aria-labelledby="dashboard-section-trends" className="space-y-4">
					<SectionHeading id="dashboard-section-trends" label="Tendances" accent="arrow" />
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
					<SectionHeading id="dashboard-section-activity" label="Activité" accent="heart" />
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
							<TopProductsWrapper period={period} periodLabel={DASHBOARD_PERIODS[period].label} />
						</Suspense>
					</div>
				</section>
			</div>
		</section>
	);
}

type SectionAccent = "star" | "circle" | "arrow" | "heart";

const ACCENT_COLOR_MAP: Record<SectionAccent, string> = {
	star: "var(--secondary)",
	circle: "var(--primary)",
	arrow: "var(--secondary)",
	heart: "var(--primary)",
};

const ACCENT_DIMENSIONS: Record<SectionAccent, { width: number; height: number }> = {
	star: { width: 22, height: 22 },
	circle: { width: 22, height: 21 },
	arrow: { width: 28, height: 14 },
	heart: { width: 22, height: 22 },
};

function SectionHeading({
	id,
	label,
	accent,
}: {
	id: string;
	label: string;
	accent: SectionAccent;
}) {
	const { width, height } = ACCENT_DIMENSIONS[accent];
	return (
		<div className="flex flex-col items-start gap-1">
			<div className="flex items-center gap-2">
				<HandDrawnAccent
					variant={accent}
					color={ACCENT_COLOR_MAP[accent]}
					width={width}
					height={height}
					strokeWidth={1.5}
					inView
				/>
				<h2
					id={id}
					className="font-display text-foreground/85 sm:text-muted-foreground text-lg font-normal tracking-tight sm:text-base sm:italic"
				>
					{label}
				</h2>
			</div>
			<HandDrawnUnderline
				color="var(--secondary)"
				width={80}
				height={14}
				strokeWidth={2}
				className="mt-0 ml-7 opacity-70"
				inView
			/>
		</div>
	);
}

function DashboardGreetingFallback() {
	return <div aria-hidden="true" className="-mt-2 mb-6 h-6 sm:h-7" />;
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

async function TopProductsWrapper({
	period,
	periodLabel,
}: {
	period: DashboardPeriod;
	periodLabel?: string;
}) {
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
	return <TopProductsList listData={listData} periodLabel={periodLabel} />;
}
