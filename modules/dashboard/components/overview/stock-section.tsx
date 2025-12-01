import { Suspense } from "react"
import { fetchDashboardKpis } from "../../data/get-kpis"
import { KpiCard } from "../kpi-card"
import { KpisSkeleton } from "../skeletons"
import { PackageX, AlertTriangle } from "lucide-react"
import { KPI_DRILLDOWN } from "../../constants/kpi-drilldown"
import { KPI_TOOLTIPS } from "../../constants/kpi-tooltips"

/**
 * Section Stock du dashboard Overview
 * Affiche les KPIs de ruptures et stock bas
 */
export async function StockSection() {
	const kpis = await fetchDashboardKpis()

	return (
		<div className="grid gap-4 md:grid-cols-2">
			<KpiCard
				title="Bijoux en rupture"
				value=""
				numericValue={kpis.outOfStock.count}
				icon={<PackageX className="h-4 w-4" />}
				href={KPI_DRILLDOWN.outOfStock.href}
				variant={kpis.outOfStock.count > 0 ? "danger" : "default"}
				subtitle={kpis.outOfStock.count > 0 ? "Action requise" : "Stock OK"}
				tooltip={KPI_TOOLTIPS.outOfStock}
			/>
			<KpiCard
				title="Stock bas"
				value=""
				numericValue={0} // TODO: Ajouter le calcul de stock bas dans les KPIs
				icon={<AlertTriangle className="h-4 w-4" />}
				href={KPI_DRILLDOWN.lowStock.href}
				variant="default"
				subtitle="< 5 unites"
				tooltip={KPI_TOOLTIPS.lowStock}
			/>
		</div>
	)
}

/**
 * Wrapper avec Suspense pour le streaming
 */
export function StockSectionWithSuspense() {
	return (
		<Suspense fallback={<KpisSkeleton count={2} ariaLabel="Chargement des indicateurs de stock" />}>
			<StockSection />
		</Suspense>
	)
}
