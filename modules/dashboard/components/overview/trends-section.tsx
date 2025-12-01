import { Suspense } from "react"
import { fetchDashboardRevenueChart } from "../../data/get-revenue-chart"
import { fetchDashboardTopProducts } from "../../data/get-top-products"
import { fetchRevenueTrends } from "../../data/get-revenue-trends"
import { RevenueChart } from "../revenue-chart"
import { RevenueYearChart } from "../revenue-year-chart"
import { TopProductsChart } from "../top-products-chart"
import { ChartSkeleton } from "../skeletons"

/**
 * Section Tendances du dashboard Overview
 * Affiche les charts de revenus et top produits
 */
export async function TrendsSection() {
	// Creer les promises pour le streaming
	const revenueChartPromise = fetchDashboardRevenueChart()
	const topProductsPromise = fetchDashboardTopProducts()
	const revenueTrendsPromise = fetchRevenueTrends()

	return (
		<div className="space-y-6">
			{/* Charts revenus */}
			<div className="grid gap-6 lg:grid-cols-2">
				<div className="lg:col-span-2">
					<Suspense fallback={<ChartSkeleton height={300} ariaLabel="Chargement du graphique des revenus" />}>
						<RevenueChart chartPromise={revenueChartPromise} />
					</Suspense>
				</div>

				<div className="lg:col-span-2">
					<Suspense fallback={<ChartSkeleton height={300} ariaLabel="Chargement des tendances annuelles" />}>
						<RevenueYearChart chartPromise={revenueTrendsPromise} />
					</Suspense>
				</div>

				<Suspense fallback={<ChartSkeleton height={300} ariaLabel="Chargement des top produits" />}>
					<TopProductsChart chartPromise={topProductsPromise} />
				</Suspense>
			</div>
		</div>
	)
}

/**
 * Wrapper avec Suspense pour le streaming
 */
export function TrendsSectionWithSuspense() {
	return (
		<Suspense fallback={<ChartSkeleton height={300} ariaLabel="Chargement des tendances" />}>
			<TrendsSection />
		</Suspense>
	)
}
