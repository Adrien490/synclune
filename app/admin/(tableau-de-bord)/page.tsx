import { PageHeader } from "@/shared/components/page-header";
import { Suspense } from "react";
import { Metadata } from "next";
import { connection } from "next/server";

import { DashboardTabs } from "@/modules/dashboard/components/dashboard-tabs";
import { PeriodSelector } from "@/modules/dashboard/components/period-selector/period-selector";
import { RefreshButton } from "@/modules/dashboard/components/refresh-button";
import { OverviewSection } from "@/modules/dashboard/components/overview/overview-section";
import { SalesSection } from "@/modules/dashboard/components/sales/sales-section";
import { InventorySection } from "@/modules/dashboard/components/inventory/inventory-section";
import { CustomersSection } from "@/modules/dashboard/components/customers/customers-section";

import {
	DEFAULT_TAB,
	isValidTab,
	type DashboardTab,
} from "@/modules/dashboard/constants/tabs";
import { DEFAULT_PERIOD } from "@/modules/dashboard/constants/periods";
import { dashboardPeriodSchema } from "@/modules/dashboard/schemas/dashboard.schemas";
import type { DashboardPeriod } from "@/modules/dashboard/utils/period-resolver";
import {
	OverviewSectionSkeleton,
	SalesSectionSkeleton,
	InventorySectionSkeleton,
	CustomersSectionSkeleton,
} from "@/modules/dashboard/components/skeletons";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration",
	description: "Vue d'ensemble de votre boutique",
};

interface AdminDashboardPageProps {
	searchParams: Promise<{
		tab?: string;
		period?: string;
		from?: string;
		to?: string;
	}>;
}

export default async function AdminDashboardPage({
	searchParams,
}: AdminDashboardPageProps) {
	// Force dynamic rendering pour activer "use cache: remote" dans les fonctions de donnees
	await connection();

	const params = await searchParams;

	// Valider l'onglet
	const tab: DashboardTab = isValidTab(params.tab) ? params.tab : DEFAULT_TAB;

	// Valider la periode
	const periodResult = dashboardPeriodSchema.safeParse(params.period);
	const period: DashboardPeriod = periodResult.success
		? periodResult.data
		: DEFAULT_PERIOD;

	// Dates custom
	const fromDate = params.from;
	const toDate = params.to;

	return (
		<>
			<PageHeader variant="compact" title="Tableau de bord" />

			{/* Navigation et filtres */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
				<DashboardTabs
					activeTab={tab}
					currentPeriod={period}
					fromDate={fromDate}
					toDate={toDate}
				/>
				<div className="flex items-center gap-3">
					{(tab === "sales" || tab === "customers") && (
						<Suspense fallback={null}>
							<PeriodSelector />
						</Suspense>
					)}
					<Suspense fallback={null}>
						<RefreshButton showTimestamp={false} />
					</Suspense>
				</div>
			</div>

			{/* Contenu de la section active - Suspense individuel par section */}
			{tab === "overview" && (
				<Suspense fallback={<OverviewSectionSkeleton />}>
					<OverviewSection />
				</Suspense>
			)}
			{tab === "sales" && (
				<Suspense fallback={<SalesSectionSkeleton />}>
					<SalesSection
						period={period}
						fromDate={fromDate}
						toDate={toDate}
					/>
				</Suspense>
			)}
			{tab === "inventory" && (
				<Suspense fallback={<InventorySectionSkeleton />}>
					<InventorySection />
				</Suspense>
			)}
			{tab === "customers" && (
				<Suspense fallback={<CustomersSectionSkeleton />}>
					<CustomersSection
						period={period}
						fromDate={fromDate}
						toDate={toDate}
					/>
				</Suspense>
			)}
		</>
	);
}
