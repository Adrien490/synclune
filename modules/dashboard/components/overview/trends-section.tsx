import { Suspense } from "react"
import { fetchDashboardRevenueChart } from "../../data/get-revenue-chart"
import { fetchRevenueTrends } from "../../data/get-revenue-trends"
import { RevenueChart } from "../revenue-chart"
import { RevenueYearChart } from "../revenue-year-chart"
import { ChartSkeleton } from "../skeletons"
import { DashboardErrorBoundary } from "../dashboard-error-boundary"
import { ChartError } from "../chart-error"

/**
 * Section Tendances du dashboard Overview
 * Affiche les charts de revenus (Top produits deplace dans OperationsWithTopProducts)
 */
export async function TrendsSection() {
	// Creer les promises pour le streaming
	const revenueChartPromise = fetchDashboardRevenueChart()
	const revenueTrendsPromise = fetchRevenueTrends()

	return (
		<div className="space-y-6">
			{/* Charts revenus */}
			<div className="grid gap-6">
				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur" description="Impossible de charger le graphique des revenus" minHeight={300} />}
				>
					<Suspense fallback={<ChartSkeleton height={300} ariaLabel="Chargement du graphique des revenus" />}>
						<RevenueChart chartDataPromise={revenueChartPromise} />
					</Suspense>
				</DashboardErrorBoundary>

				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur" description="Impossible de charger les tendances annuelles" minHeight={300} />}
				>
					<Suspense fallback={<ChartSkeleton height={300} ariaLabel="Chargement des tendances annuelles" />}>
						<RevenueYearChart chartDataPromise={revenueTrendsPromise} />
					</Suspense>
				</DashboardErrorBoundary>
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
