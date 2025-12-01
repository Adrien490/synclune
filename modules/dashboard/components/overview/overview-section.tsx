import { Suspense } from "react";
import { fetchDashboardKpis } from "../../data/get-kpis";
import { fetchDashboardRevenueChart } from "../../data/get-revenue-chart";
import { fetchDashboardTopProducts } from "../../data/get-top-products";
import { fetchDashboardOrdersStatus } from "../../data/get-orders-status";
import { fetchFulfillmentStatus } from "../../data/get-fulfillment-status";
import { fetchRevenueTrends } from "../../data/get-revenue-trends";
import { DashboardKpis } from "../dashboard-kpis";
import { RevenueChart } from "../revenue-chart";
import { TopProductsChart } from "../top-products-chart";
import { OrdersStatusChart } from "../orders-status-chart";
import { FulfillmentStatusChart } from "../fulfillment-status-chart";
import { RevenueYearChart } from "../revenue-year-chart";
import { KpisSkeleton, ChartSkeleton } from "../skeletons";

/**
 * Section Vue d'ensemble du dashboard
 * Affiche les KPIs principaux et les graphiques de synthese
 */
export async function OverviewSection() {
	// Creer les promises pour les donnees
	const kpisPromise = fetchDashboardKpis();
	const revenueChartPromise = fetchDashboardRevenueChart();
	const topProductsPromise = fetchDashboardTopProducts();
	const ordersStatusPromise = fetchDashboardOrdersStatus();
	const fulfillmentStatusPromise = fetchFulfillmentStatus();
	const revenueTrendsPromise = fetchRevenueTrends();

	return (
		<div className="space-y-6">
			{/* KPIs */}
			<Suspense fallback={<KpisSkeleton count={6} ariaLabel="Chargement des indicateurs cles" />}>
				<DashboardKpis kpisPromise={kpisPromise} />
			</Suspense>

			{/* Graphiques principaux */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Revenus 30 jours */}
				<div className="lg:col-span-2">
					<Suspense fallback={<ChartSkeleton />}>
						<RevenueChart chartPromise={revenueChartPromise} />
					</Suspense>
				</div>

				{/* Tendances 12 mois - juste en dessous du graphique revenus */}
				<div className="lg:col-span-2">
					<Suspense fallback={<ChartSkeleton />}>
						<RevenueYearChart chartPromise={revenueTrendsPromise} />
					</Suspense>
				</div>

				<Suspense fallback={<ChartSkeleton />}>
					<TopProductsChart chartPromise={topProductsPromise} />
				</Suspense>

				<Suspense fallback={<ChartSkeleton />}>
					<OrdersStatusChart chartPromise={ordersStatusPromise} />
				</Suspense>

				<Suspense fallback={<ChartSkeleton />}>
					<FulfillmentStatusChart chartPromise={fulfillmentStatusPromise} />
				</Suspense>
			</div>
		</div>
	);
}
