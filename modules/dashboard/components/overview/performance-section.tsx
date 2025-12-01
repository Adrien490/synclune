import { Suspense } from "react"
import { fetchDashboardKpis } from "../../data/get-kpis"
import { KpiCard } from "../kpi-card"
import { KpisSkeleton } from "../skeletons"
import { Euro, ShoppingCart, TrendingUp } from "lucide-react"
import { KPI_DRILLDOWN } from "../../constants/kpi-drilldown"
import { KPI_TOOLTIPS } from "../../constants/kpi-tooltips"

/**
 * Section Performance du dashboard Overview
 * Affiche les KPIs de CA et commandes
 */
export async function PerformanceSection() {
	const kpis = await fetchDashboardKpis()

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<KpiCard
				title="CA du jour"
				value=""
				numericValue={kpis.todayRevenue.amount / 100}
				suffix=" €"
				decimalPlaces={2}
				evolution={kpis.todayRevenue.evolution}
				subtitle="vs hier"
				icon={<Euro className="h-4 w-4" />}
				href={KPI_DRILLDOWN.todayRevenue.href}
				tooltip={KPI_TOOLTIPS.todayRevenue}
			/>
			<KpiCard
				title="CA du mois"
				value=""
				numericValue={kpis.monthlyRevenue.amount / 100}
				suffix=" €"
				decimalPlaces={2}
				evolution={kpis.monthlyRevenue.evolution}
				subtitle="vs mois dernier"
				icon={<TrendingUp className="h-4 w-4" />}
				href={KPI_DRILLDOWN.monthRevenue.href}
				tooltip={KPI_TOOLTIPS.monthRevenue}
			/>
			<KpiCard
				title="Panier moyen"
				value=""
				numericValue={kpis.averageOrderValue.amount / 100}
				suffix=" €"
				decimalPlaces={2}
				evolution={kpis.averageOrderValue.evolution}
				subtitle="vs mois dernier"
				icon={<ShoppingCart className="h-4 w-4" />}
				href={KPI_DRILLDOWN.averageOrderValue.href}
				tooltip={KPI_TOOLTIPS.averageOrderValue}
			/>
			<KpiCard
				title="Commandes du mois"
				value=""
				numericValue={kpis.monthlyOrders.count}
				evolution={kpis.monthlyOrders.evolution}
				subtitle="vs mois dernier"
				icon={<ShoppingCart className="h-4 w-4" />}
				href={KPI_DRILLDOWN.monthOrders.href}
				tooltip={KPI_TOOLTIPS.monthOrders}
			/>
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
