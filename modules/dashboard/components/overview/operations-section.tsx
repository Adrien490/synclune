import { fetchDashboardKpis } from "../../data/get-kpis"
import { KpiCard } from "../kpi-card"
import { Clock, AlertTriangle } from "lucide-react"
import { KPI_DRILLDOWN } from "../../constants/kpi-drilldown"
import { KPI_TOOLTIPS } from "../../constants/kpi-tooltips"

/**
 * Section Operations du dashboard Overview
 * Affiche les KPIs de commandes en cours
 */
export async function OperationsSection() {
	const kpis = await fetchDashboardKpis()

	return (
		<div className="grid gap-4 md:grid-cols-2">
			<KpiCard
				title="Commandes en traitement"
				value=""
				numericValue={kpis.pendingOrders.count}
				subtitle={
					kpis.pendingOrders.urgentCount > 0
						? `dont ${kpis.pendingOrders.urgentCount} urgente(s)`
						: "Tout à jour"
				}
				icon={<Clock className="h-4 w-4" />}
				href={KPI_DRILLDOWN.pendingOrders.href}
				variant={kpis.pendingOrders.urgentCount > 0 ? "warning" : "default"}
				tooltip={KPI_TOOLTIPS.pendingOrders}
			/>
			<KpiCard
				title="Commandes urgentes"
				value=""
				numericValue={kpis.pendingOrders.urgentCount}
				subtitle="> 48h en attente"
				icon={<AlertTriangle className="h-4 w-4" />}
				href={KPI_DRILLDOWN.urgentOrders.href}
				variant={kpis.pendingOrders.urgentCount > 0 ? "danger" : "default"}
				tooltip={KPI_TOOLTIPS.urgentOrders}
			/>
		</div>
	)
}
