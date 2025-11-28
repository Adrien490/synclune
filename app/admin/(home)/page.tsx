import { PageHeader } from "@/shared/components/page-header";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import { fetchDashboardOrdersStatus } from "@/modules/dashboard/data/get-orders-status";
import { fetchDashboardRevenueChart } from "@/modules/dashboard/data/get-revenue-chart";
import { fetchDashboardTopProducts } from "@/modules/dashboard/data/get-top-products";
import { connection } from "next/server";
import { Suspense } from "react";
import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { OrdersStatusChart } from "@/modules/dashboard/components/orders-status-chart";
import { RevenueChart } from "@/modules/dashboard/components/revenue-chart";
import { TopProductsChart } from "@/modules/dashboard/components/top-products-chart";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration",
	description: "Vue d'ensemble de votre boutique",
};

// Skeleton components
function KpisSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement des indicateurs clés"
			className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
		>
			{[...Array(6)].map((_, i) => (
				<Card key={i} className="border-l-4 border-primary/40">
					<CardContent className="p-6">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-32 mb-2" />
						<Skeleton className="h-3 w-16" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function ChartSkeleton() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du graphique">
			<Card className="border-l-4 border-primary/30">
				<CardContent className="p-6">
					<Skeleton className="h-6 w-48 mb-2" />
					<Skeleton className="h-4 w-64 mb-4" />
					<Skeleton className="h-[300px] w-full" />
				</CardContent>
			</Card>
		</div>
	);
}

export default async function AdminDashboardPage() {
	// Rend la page dynamique pour permettre use cache: remote dans les fonctions
	await connection();

	// Créer les promises pour les données
	const kpisPromise = fetchDashboardKpis();
	const revenueChartPromise = fetchDashboardRevenueChart();
	const topProductsPromise = fetchDashboardTopProducts();
	const ordersStatusPromise = fetchDashboardOrdersStatus();

	return (
		<>
			<PageHeader variant="compact"
				title="Tableau de bord"
				description="Vue d'ensemble de votre boutique en temps réel"
			/>

			<div className="space-y-6">
				{/* KPIs */}
				<Suspense fallback={<KpisSkeleton />}>
					<DashboardKpis kpisPromise={kpisPromise} />
				</Suspense>

				{/* Graphiques principaux */}
				<div className="grid gap-6 lg:grid-cols-2">
					<div className="lg:col-span-2">
						<Suspense fallback={<ChartSkeleton />}>
							<RevenueChart chartPromise={revenueChartPromise} />
						</Suspense>
					</div>

					<Suspense fallback={<ChartSkeleton />}>
						<TopProductsChart chartPromise={topProductsPromise} />
					</Suspense>

					<Suspense fallback={<ChartSkeleton />}>
						<OrdersStatusChart chartPromise={ordersStatusPromise} />
					</Suspense>
				</div>
			</div>
		</>
	);
}
