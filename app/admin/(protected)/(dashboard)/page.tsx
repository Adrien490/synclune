import { Suspense } from "react";
import { type Metadata } from "next";
import * as Sentry from "@sentry/nextjs";

import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

import { SectionHeading } from "./_components/section-heading";

import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { DashboardAlerts } from "@/modules/dashboard/components/dashboard-alerts";
import { ChartError } from "@/modules/dashboard/components/chart-error";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { RefreshDashboardButton } from "@/modules/dashboard/components/refresh-dashboard-button";
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

export const metadata: Metadata = {
	title: "Tableau de bord - Administration",
	description: "Vue d'ensemble de ta boutique",
};

export default async function AdminDashboardPage() {
	// Les 5 fetchers `modules/dashboard/data/*` (CA, TVA, alertes, commandes
	// récentes, actions à mener) sont en `"use cache"` : ils ne PEUVENT pas
	// s'auto-garder, `isAdmin()` lisant `headers()`, source dynamique interdite
	// dans ce scope. C'est donc à la page de porter la garde — cf. le JSDoc
	// d'`assertAdminPage` pour pourquoi le layout ne suffit pas.
	await assertAdminPage();

	return (
		<section aria-label="Tableau de bord" className="relative isolate">
			<h1 className="sr-only">Tableau de bord</h1>
			{/* Lot 4 S3.5 : plus de sélecteur de période ni de sheets mobiles — le
			    tableau de bord montre le mois en cours, un seul bouton Rafraîchir. */}
			<header className="mb-4 md:mb-6">
				<div
					role="group"
					aria-label="Actions du tableau de bord"
					className="flex w-full flex-wrap items-center justify-end gap-3"
				>
					<RefreshDashboardButton />
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
							<KpisSkeleton count={4} compactCount={2} ariaLabel="Chargement des indicateurs" />
						}
					>
						<KpisWrapper />
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
	return <DashboardKpis kpis={kpis} />;
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
