import { PageHeader } from "@/shared/components/page-header";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis";
import { fetchDashboardOrdersStatus } from "@/modules/dashboard/data/get-orders-status";
import { fetchDashboardRecentOrders } from "@/modules/dashboard/data/get-recent-orders";
import { fetchDashboardRevenueChart } from "@/modules/dashboard/data/get-revenue-chart";
import { fetchDashboardStockAlerts } from "@/modules/dashboard/data/get-stock-alerts";
import { fetchDashboardTopProducts } from "@/modules/dashboard/data/get-top-products";
import { connection } from "next/server";
import { Suspense } from "react";
import { DashboardKpis } from "@/modules/dashboard/components/dashboard-kpis";
import { OrdersStatusChart } from "@/modules/dashboard/components/orders-status-chart";
import { RecentOrdersList } from "@/modules/dashboard/components/recent-orders-list";
import { RevenueChart } from "@/modules/dashboard/components/revenue-chart";
import { StockAlertsList } from "@/modules/dashboard/components/stock-alerts-list";
import { TopProductsChart } from "@/modules/dashboard/components/top-products-chart";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration",
	description: "Vue d'ensemble de votre boutique",
};

// Skeleton components
function KpisSkeleton() {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{[...Array(6)].map((_, i) => (
				<Card key={i}>
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
		<Card>
			<CardContent className="p-6">
				<Skeleton className="h-6 w-48 mb-2" />
				<Skeleton className="h-4 w-64 mb-4" />
				<Skeleton className="h-[300px] w-full" />
			</CardContent>
		</Card>
	);
}

function ListSkeleton() {
	return (
		<Card>
			<CardContent className="p-6">
				<Skeleton className="h-6 w-48 mb-2" />
				<Skeleton className="h-4 w-64 mb-4" />
				<div className="space-y-3">
					{[...Array(5)].map((_, i) => (
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
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
	const recentOrdersPromise = fetchDashboardRecentOrders();
	const stockAlertsPromise = fetchDashboardStockAlerts();

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

				{/* Listes rapides */}
				<div className="grid gap-6 lg:grid-cols-2">
					<Suspense fallback={<ListSkeleton />}>
						<RecentOrdersList ordersPromise={recentOrdersPromise} />
					</Suspense>

					<Suspense fallback={<ListSkeleton />}>
						<StockAlertsList alertsPromise={stockAlertsPromise} />
					</Suspense>
				</div>
			</div>
		</>
	);
}
