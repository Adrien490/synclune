import { Suspense } from "react"
import { fetchInventoryKpis } from "../../data/get-inventory-kpis"
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
	const kpis = await fetchInventoryKpis()

	return (
		<div className="grid gap-4 md:grid-cols-2">
			<KpiCard
				title="Bijoux en rupture"
				value=""
				numericValue={kpis.outOfStock.count}
				icon={<PackageX className="h-4 w-4" />}
				href={KPI_DRILLDOWN.outOfStock.href}
				subtitle={kpis.outOfStock.count > 0 ? "Action requise" : "Stock OK"}
				tooltip={KPI_TOOLTIPS.outOfStock}
				size="compact"
				priority="alert"
				status={kpis.outOfStock.count > 0 ? "danger" : "default"}
			/>
			<KpiCard
				title="Stock bas"
				value=""
				numericValue={kpis.lowStock.count}
				icon={<AlertTriangle className="h-4 w-4" />}
				href={KPI_DRILLDOWN.lowStock.href}
				subtitle={`≤ ${kpis.lowStock.threshold} unités`}
				tooltip={KPI_TOOLTIPS.lowStock}
				size="compact"
				priority="info"
				status={kpis.lowStock.count > 0 ? "warning" : "default"}
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
