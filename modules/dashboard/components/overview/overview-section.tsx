import { Suspense } from "react"
import { PerformanceSection } from "./performance-section"
import { OperationsSection } from "./operations-section"
import { StockSection } from "./stock-section"
import { TrendsSection } from "./trends-section"
import { KpisSkeleton, ChartSkeleton } from "../skeletons"
import { DashboardErrorBoundary } from "../dashboard-error-boundary"
import { ChartError } from "../chart-error"

/**
 * Section Vue d'ensemble du dashboard
 */
export async function OverviewSection() {
	return (
		<>
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

			<DashboardErrorBoundary
				fallback={<ChartError title="Erreur de chargement" description="Impossible de charger les indicateurs d'operations" minHeight={120} />}
			>
				<Suspense
					fallback={
						<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs d'operations" />
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
						<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs de stock" />
					}
				>
					<StockSection />
				</Suspense>
			</DashboardErrorBoundary>

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
		</>
	)
}
