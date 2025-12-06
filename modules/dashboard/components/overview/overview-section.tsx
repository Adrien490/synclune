import { Suspense } from "react"
import { PerformanceSection } from "./performance-section"
import { OperationsSection } from "./operations-section"
import { StockSection } from "./stock-section"
import { TrendsSection } from "./trends-section"
import { KpisSkeleton, ChartSkeleton } from "../skeletons"
import { DashboardErrorBoundary } from "../dashboard-error-boundary"
import { ChartError } from "../chart-error"
import { TopProductsChart } from "../top-products-chart"
import { fetchDashboardTopProducts } from "../../data/get-top-products"

/**
 * Section Vue d'ensemble du dashboard
 */
export async function OverviewSection() {
	// Promise pour TopProductsChart
	const topProductsPromise = fetchDashboardTopProducts()

	return (
		<div className="space-y-6">
			<DashboardErrorBoundary
				fallback={<ChartError title="Erreur de chargement" description="Impossible de charger les indicateurs de performance" minHeight={120} />}
			>
				<Suspense
					fallback={
						<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs de performance" />
					}
				>
					<PerformanceSection />
				</Suspense>
			</DashboardErrorBoundary>

			{/* Section Top Produits (50%) + KPIs Operations/Stock (50%) */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Gauche: Top 5 bijoux vendus */}
				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur de chargement" description="Impossible de charger les top produits" minHeight={300} />}
				>
					<Suspense fallback={<ChartSkeleton height={300} ariaLabel="Chargement des top produits" />}>
						<TopProductsChart chartDataPromise={topProductsPromise} />
					</Suspense>
				</DashboardErrorBoundary>

				{/* Droite: 4 KPIs sur 2 colonnes */}
				<div className="space-y-4">
					<DashboardErrorBoundary
						fallback={<ChartError title="Erreur de chargement" description="Impossible de charger les indicateurs d'operations" minHeight={120} />}
					>
						<Suspense
							fallback={
								<KpisSkeleton count={2} ariaLabel="Chargement des indicateurs d'operations" />
							}
						>
							<OperationsSection />
						</Suspense>
					</DashboardErrorBoundary>

					<DashboardErrorBoundary
						fallback={<ChartError title="Erreur de chargement" description="Impossible de charger les indicateurs de stock" minHeight={120} />}
					>
						<Suspense
							fallback={
								<KpisSkeleton count={2} ariaLabel="Chargement des indicateurs de stock" />
							}
						>
							<StockSection />
						</Suspense>
					</DashboardErrorBoundary>
				</div>
			</div>

			{/* Cacher sur mobile */}
			<div className="hidden md:block">
				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur de chargement" description="Impossible de charger les tendances" minHeight={300} />}
				>
					<Suspense
						fallback={
							<ChartSkeleton height={300} ariaLabel="Chargement des tendances" />
						}
					>
						<TrendsSection />
					</Suspense>
				</DashboardErrorBoundary>
			</div>
		</div>
	)
}
