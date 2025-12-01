import { Suspense } from "react"
import { fetchDashboardKpis } from "../../data/get-kpis"
import { fetchKpiSparklines } from "../../data/get-kpi-sparklines"
import { KpiCard } from "../kpi-card"
import { KpisSkeleton } from "../skeletons"
import { Euro, ShoppingCart, TrendingUp, Package } from "lucide-react"
import { KPI_DRILLDOWN } from "../../constants/kpi-drilldown"
import { KPI_TOOLTIPS } from "../../constants/kpi-tooltips"

/**
 * Section Performance du dashboard Overview
 * Affiche les KPIs de CA et commandes avec hierarchie visuelle:
 * - Featured (CA mois, Commandes mois) en haut
 * - Default (CA jour, Panier moyen) en dessous
 */
export async function PerformanceSection() {
	const [kpis, sparklines] = await Promise.all([
		fetchDashboardKpis(),
		fetchKpiSparklines(),
	])

	return (
		<div className="space-y-4">
			{/* Featured KPIs - CA mois et Commandes mois */}
			<div className="grid gap-4 md:grid-cols-2">
				<KpiCard
					title="CA du mois"
					value=""
					numericValue={kpis.monthlyRevenue.amount / 100}
					suffix=" €"
					decimalPlaces={2}
					evolution={kpis.monthlyRevenue.evolution}
					comparisonLabel="vs mois dernier"
					icon={<TrendingUp className="h-5 w-5" />}
					href={KPI_DRILLDOWN.monthRevenue.href}
					tooltip={KPI_TOOLTIPS.monthRevenue}
					size="featured"
					priority="critical"
					sparklineData={sparklines.dailyRevenue}
				/>
				<KpiCard
					title="Commandes du mois"
					value=""
					numericValue={kpis.monthlyOrders.count}
					evolution={kpis.monthlyOrders.evolution}
					comparisonLabel="vs mois dernier"
					icon={<Package className="h-5 w-5" />}
					href={KPI_DRILLDOWN.monthOrders.href}
					tooltip={KPI_TOOLTIPS.monthOrders}
					size="featured"
					priority="critical"
					sparklineData={sparklines.dailyOrders}
				/>
			</div>

			{/* Standard KPIs - CA jour et Panier moyen */}
			<div className="grid gap-4 md:grid-cols-2">
				<KpiCard
					title="CA du jour"
					value=""
					numericValue={kpis.todayRevenue.amount / 100}
					suffix=" €"
					decimalPlaces={2}
					evolution={kpis.todayRevenue.evolution}
					comparisonLabel="vs hier"
					icon={<Euro className="h-4 w-4" />}
					href={KPI_DRILLDOWN.todayRevenue.href}
					tooltip={KPI_TOOLTIPS.todayRevenue}
					size="default"
					priority="critical"
					sparklineData={sparklines.dailyRevenue}
				/>
				<KpiCard
					title="Panier moyen"
					value=""
					numericValue={kpis.averageOrderValue.amount / 100}
					suffix=" €"
					decimalPlaces={2}
					evolution={kpis.averageOrderValue.evolution}
					comparisonLabel="vs mois dernier"
					icon={<ShoppingCart className="h-4 w-4" />}
					href={KPI_DRILLDOWN.averageOrderValue.href}
					tooltip={KPI_TOOLTIPS.averageOrderValue}
					size="default"
					priority="operational"
					sparklineData={sparklines.dailyAov}
				/>
			</div>
		</div>
	)
}

/**
 * Wrapper avec Suspense pour le streaming
 */
export function PerformanceSectionWithSuspense() {
	return (
		<Suspense fallback={<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs de performance" />}>
			<PerformanceSection />
		</Suspense>
	)
}
