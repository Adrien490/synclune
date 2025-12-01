import { PageHeader } from "@/shared/components/page-header";
import { connection } from "next/server";
import { Suspense } from "react";
import { Metadata } from "next";

import { DashboardTabs } from "@/modules/dashboard/components/dashboard-tabs";
import { PeriodSelector } from "@/modules/dashboard/components/period-selector";
import { OverviewSection } from "@/modules/dashboard/components/overview/overview-section";
import { SalesSection } from "@/modules/dashboard/components/sales/sales-section";
import { InventorySection } from "@/modules/dashboard/components/inventory/inventory-section";
import { CustomersSection } from "@/modules/dashboard/components/customers/customers-section";

import {
	DEFAULT_TAB,
	isValidTab,
	type DashboardTab,
} from "@/modules/dashboard/constants/tabs";
import {
	DEFAULT_PERIOD,
	
} from "@/modules/dashboard/constants/periods";
import { dashboardPeriodSchema } from "@/modules/dashboard/schemas/dashboard.schemas";
import type { DashboardPeriod } from "@/modules/dashboard/utils/period-resolver";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration",
	description: "Vue d'ensemble de votre boutique",
};

// Skeleton pour le chargement des sections
function SectionSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<Card key={i} className="border-l-4 border-primary/40">
						<CardContent className="p-6">
							<Skeleton className="h-4 w-24 mb-2" />
							<Skeleton className="h-8 w-32 mb-2" />
							<Skeleton className="h-3 w-16" />
						</CardContent>
					</Card>
				))}
			</div>
			<div className="grid gap-6 lg:grid-cols-2">
				<Card className="lg:col-span-2 border-l-4 border-primary/30">
					<CardContent className="p-6">
						<Skeleton className="h-[300px] w-full" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

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
	// Rend la page dynamique pour permettre use cache: remote dans les fonctions
	await connection();

	// Parser les parametres
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
			<PageHeader
				variant="compact"
				title="Tableau de bord"
				description="Vue d'ensemble de votre boutique en temps reel"
			/>

			{/* Navigation et filtres */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
				<DashboardTabs
					activeTab={tab}
					currentPeriod={period}
					fromDate={fromDate}
					toDate={toDate}
				/>
				{tab !== "inventory" && (
					<Suspense fallback={null}>
						<PeriodSelector showQuickButtons={true} />
					</Suspense>
				)}
			</div>

			{/* Contenu de la section active */}
			<Suspense fallback={<SectionSkeleton />}>
				{tab === "overview" && <OverviewSection />}
				{tab === "sales" && (
					<SalesSection
						period={period}
						fromDate={fromDate}
						toDate={toDate}
					/>
				)}
				{tab === "inventory" && <InventorySection />}
				{tab === "customers" && (
					<CustomersSection
						period={period}
						fromDate={fromDate}
						toDate={toDate}
					/>
				)}
			</Suspense>
		</>
	);
}
