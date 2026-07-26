import { Suspense } from "react";
import { type Metadata } from "next";
import * as Sentry from "@sentry/nextjs";

import { SectionHeading } from "./_components/section-heading";

import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { DashboardAlerts } from "@/modules/dashboard/components/dashboard-alerts";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { RefreshDashboardButton } from "@/modules/dashboard/components/refresh-dashboard-button";
import { PeriodSelector } from "@/modules/dashboard/components/period-selector";
import { DashboardMobileActions } from "@/modules/dashboard/components/dashboard-mobile-actions";
import { VatProgressCard } from "@/modules/dashboard/components/vat-progress-card";

import {
	KpisSkeleton,
	ListSkeleton,
	VatProgressSkeleton,
} from "@/modules/dashboard/components/skeletons";

import { fetchDashboardRecentOrders } from "@/modules/dashboard/data/get-recent-orders";
import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import { fetchDashboardAlerts } from "@/modules/dashboard/data/get-alerts";
import { fetchDashboardActionItems } from "@/modules/dashboard/data/get-action-items";
import { fetchDashboardVatProgress } from "@/modules/dashboard/data/get-vat-progress";
import { getNextUrssafDeadline } from "@/modules/dashboard/services/urssaf-deadline.service";

import { getComparisonLabel, parsePeriod } from "@/modules/dashboard/constants/period.constants";
import type { DashboardPeriod } from "@/modules/dashboard/constants/period.constants";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration",
	description: "Vue d'ensemble de ta boutique",
};

type AdminDashboardPageProps = {
	searchParams: Promise<{ period?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
	const params = await searchParams;
	const period = parsePeriod(params.period);

	return (
		<section aria-label="Tableau de bord" className="relative isolate">
			<h1 className="sr-only">Tableau de bord</h1>
			<header className="mb-4 md:mb-6">
				<div
					role="group"
					aria-label="Actions du tableau de bord"
					className="flex w-full flex-wrap items-center justify-start gap-3 md:justify-end"
				>
					<div className="hidden w-full items-center gap-3 md:flex md:w-auto md:justify-end">
						<PeriodSelector />
						<RefreshDashboardButton />
					</div>
					<DashboardMobileActions className="md:hidden" />
				</div>
			</header>

			<div className="space-y-8">
				<Suspense>
					<AlertsWrapper />
				</Suspense>

				<section aria-labelledby="dashboard-section-performance" className="space-y-4">
					<SectionHeading
						id="dashboard-section-performance"
						label="Performance ventes"
						accent="star"
					/>
					<Suspense
						fallback={
							<KpisSkeleton count={4} compactCount={3} ariaLabel="Chargement des indicateurs" />
						}
					>
						<KpisWrapper period={period} />
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

				<section aria-labelledby="dashboard-section-activity" className="space-y-4">
					<SectionHeading id="dashboard-section-activity" label="Activité" accent="heart" />
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

async function KpisWrapper({ period }: { period: DashboardPeriod }) {
	let kpis;
	try {
		kpis = await fetchDashboardKpis(period);
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
	return <DashboardKpis kpis={kpis} comparisonLabel={getComparisonLabel(period)} />;
}

async function AlertsWrapper() {
	let alerts;
	let actionItems;
	try {
		[alerts, actionItems] = await Promise.all([
			fetchDashboardAlerts(),
			fetchDashboardActionItems(),
		]);
	} catch (error) {
		Sentry.captureException(error);
		return null;
	}
	const urssafDeadline = getNextUrssafDeadline();
	return (
		<DashboardAlerts alerts={alerts} actionItems={actionItems} urssafDeadline={urssafDeadline} />
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
