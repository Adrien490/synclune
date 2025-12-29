import { Euro, ShoppingBag, Receipt } from "lucide-react"
import { fetchDashboardKpis } from "@/modules/dashboard/data/get-kpis"
import { KpiCard } from "./kpi-card"

/**
 * Composant async pour les 3 KPIs du dashboard admin
 * - CA du mois
 * - Commandes du mois
 * - Panier moyen
 */
export async function DashboardKpis() {
	const kpis = await fetchDashboardKpis()

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
			maximumFractionDigits: 0,
		}).format(amount)

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{/* CA du mois */}
			<KpiCard
				title="CA du mois"
				value={formatCurrency(kpis.monthlyRevenue.amount)}
				numericValue={kpis.monthlyRevenue.amount}
				suffix=" €"
				evolution={kpis.monthlyRevenue.evolution}
				comparisonLabel="vs mois dernier"
				icon={<Euro className="h-4 w-4" />}
				size="featured"
				priority="critical"
				href="/admin/ventes/commandes?paymentStatus=PAID"
				tooltip="Chiffre d'affaires total des commandes payées ce mois"
			/>

			{/* Commandes du mois */}
			<KpiCard
				title="Commandes"
				value={kpis.monthlyOrders.count.toString()}
				numericValue={kpis.monthlyOrders.count}
				evolution={kpis.monthlyOrders.evolution}
				comparisonLabel="vs mois dernier"
				icon={<ShoppingBag className="h-4 w-4" />}
				size="featured"
				priority="critical"
				href="/admin/ventes/commandes"
				tooltip="Nombre de commandes payées ce mois"
			/>

			{/* Panier moyen */}
			<KpiCard
				title="Panier moyen"
				value={formatCurrency(kpis.averageOrderValue.amount)}
				numericValue={kpis.averageOrderValue.amount}
				suffix=" €"
				evolution={kpis.averageOrderValue.evolution}
				comparisonLabel="vs mois dernier"
				icon={<Receipt className="h-4 w-4" />}
				size="featured"
				priority="operational"
				tooltip="Valeur moyenne des commandes ce mois"
			/>
		</div>
	)
}
