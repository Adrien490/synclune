import { type Metadata } from "next";
import { Suspense } from "react";

import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { getDashboardKpis } from "@/modules/dashboard/data/get-dashboard-kpis";
import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { Skeleton } from "@/shared/components/ui/skeleton";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration | Synclune",
	description: "Vue d'ensemble de ta boutique",
};

/** Tableau de bord — KPI du schéma lean (lot 6). */
export default async function AdminDashboardPage() {
	await assertAdminPage();

	const kpisPromise = getDashboardKpis();

	return (
		<section aria-label="Tableau de bord" className="space-y-6">
			<h1 className="font-display text-2xl font-normal tracking-tight">Tableau de bord</h1>
			<Suspense
				fallback={
					<div
						className="space-y-6"
						role="status"
						aria-busy="true"
						aria-label="Chargement des indicateurs"
					>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{Array.from({ length: 4 }, (_, index) => (
								<Skeleton key={index} shape="rounded" className="h-28 w-full" />
							))}
						</div>
						<div className="grid gap-6 lg:grid-cols-2">
							<Skeleton shape="rounded" className="h-44 w-full" />
							<Skeleton shape="rounded" className="h-44 w-full" />
						</div>
						<span className="sr-only">Chargement…</span>
					</div>
				}
			>
				<DashboardKpis kpisPromise={kpisPromise} />
			</Suspense>
		</section>
	);
}
