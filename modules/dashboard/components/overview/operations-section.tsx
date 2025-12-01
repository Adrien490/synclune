import { Suspense } from "react"
import { fetchDashboardKpis } from "../../data/get-kpis"
import { fetchFulfillmentStatus } from "../../data/get-fulfillment-status"
import { KpiCard } from "../kpi-card"
import { FulfillmentStatusChart } from "../fulfillment-status-chart"
import { KpisSkeleton, ChartSkeleton } from "../skeletons"
import { Clock, AlertTriangle } from "lucide-react"
import { KPI_DRILLDOWN } from "../../constants/kpi-drilldown"
import { KPI_TOOLTIPS } from "../../constants/kpi-tooltips"

/**
 * Section Operations du dashboard Overview
 * Affiche les KPIs de commandes en cours et le chart fulfillment
 */
export async function OperationsSection() {
	// Fetch les KPIs de maniere synchrone, garder fulfillment comme promise pour Suspense
	const kpis = await fetchDashboardKpis()
	const fulfillmentPromise = fetchFulfillmentStatus()

	return (
		<div className="space-y-4">
			{/* KPIs Operations */}
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

			{/* Chart Fulfillment */}
			<Suspense fallback={<ChartSkeleton height={250} ariaLabel="Chargement du graphique fulfillment" />}>
				<FulfillmentStatusChart chartPromise={fulfillmentPromise} />
			</Suspense>
		</div>
	)
}

/**
 * Wrapper avec Suspense pour le streaming
 */
export function OperationsSectionWithSuspense() {
	return (
		<Suspense fallback={<KpisSkeleton count={2} ariaLabel="Chargement des indicateurs d'operations" />}>
			<OperationsSection />
		</Suspense>
	)
}
