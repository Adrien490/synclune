import { Suspense } from "react"
import { OverviewAccordion } from "./overview-accordion"
import { SectionWrapper } from "./section-wrapper"
import { PerformanceSection } from "./performance-section"
import { OperationsSection } from "./operations-section"
import { StockSection } from "./stock-section"
import { TrendsSection } from "./trends-section"
import { KpisSkeleton, ChartSkeleton } from "../skeletons"
import { DashboardErrorBoundary } from "../dashboard-error-boundary"
import { ChartError } from "../chart-error"

/**
 * Section Vue d'ensemble du dashboard
 * Reorganisee en sections pliables (accordions) pour reduire la surcharge cognitive
 *
 * Sections:
 * - Performance: CA jour, CA mois, Panier moyen, Commandes
 * - Operations: Commandes en traitement, fulfillment status
 * - Stock: Ruptures, alertes stock
 * - Tendances: Charts revenus, top produits
 */
export async function OverviewSection() {
	return (
		<OverviewAccordion>
			{/* Section Performance */}
			<SectionWrapper sectionId="performance">
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
			</SectionWrapper>

			{/* Section Operations */}
			<SectionWrapper sectionId="operations">
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
			</SectionWrapper>

			{/* Section Stock */}
			<SectionWrapper sectionId="stock">
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
			</SectionWrapper>

			{/* Section Tendances */}
			<SectionWrapper sectionId="trends">
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
			</SectionWrapper>
		</OverviewAccordion>
	)
}
