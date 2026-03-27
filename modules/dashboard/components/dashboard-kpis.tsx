import { Euro, Package, Receipt, ShoppingBag, Target } from "lucide-react";
import type { GetKpisReturn } from "@/modules/dashboard/data/get-kpis";
import { formatEuro } from "@/shared/utils/format-euro";
import { KpiCard } from "./kpi-card";

interface DashboardKpisProps {
	kpis: GetKpisReturn;
}

/**
 * Dashboard KPIs grid - 4 featured + 1 compact
 * Row 1: CA net, Commandes, Panier moyen, A expedier
 * Row 2: Taux de conversion
 */
export function DashboardKpis({ kpis }: DashboardKpisProps) {
	const hasRefunds = kpis.monthlyRevenue.refundCount > 0;
	const hasDiscounts = kpis.discountImpact.amount > 0;

	// Build revenue subtitle with discount and refund info
	const revenueSubtitleParts: string[] = [];
	if (hasDiscounts) {
		revenueSubtitleParts.push(`-${formatEuro(kpis.discountImpact.amount)} remises`);
	}
	if (hasRefunds) {
		revenueSubtitleParts.push(
			`-${formatEuro(kpis.monthlyRevenue.refundAmount)} remb. (${kpis.monthlyRevenue.refundCount})`,
		);
	}
	const revenueSubtitle =
		revenueSubtitleParts.length > 0 ? revenueSubtitleParts.join(" · ") : undefined;

	return (
		<div className="space-y-4">
			{/* Row 1: 4 featured KPIs */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{/* CA net du mois */}
				<KpiCard
					title="CA net du mois"
					value={formatEuro(kpis.monthlyRevenue.netAmount, { compact: true })}
					numericValue={kpis.monthlyRevenue.netAmount}
					suffix=" €"
					evolution={kpis.monthlyRevenue.evolution}
					comparisonLabel="vs mois dernier"
					icon={<Euro className="h-4 w-4" />}
					size="featured"
					priority="critical"
					href="/admin/ventes/commandes?paymentStatus=PAID"
					tooltip="Chiffre d'affaires net (apres remboursements) des commandes payees ce mois"
					subtitle={revenueSubtitle}
					badge={
						hasRefunds
							? {
									label: `${kpis.monthlyRevenue.refundCount} remb.`,
									variant: "destructive",
								}
							: undefined
					}
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
					tooltip="Nombre de commandes payees ce mois"
				/>

				{/* Panier moyen */}
				<KpiCard
					title="Panier moyen"
					value={formatEuro(kpis.averageOrderValue.amount, { compact: true })}
					numericValue={kpis.averageOrderValue.amount}
					suffix=" €"
					evolution={kpis.averageOrderValue.evolution}
					comparisonLabel="vs mois dernier"
					icon={<Receipt className="h-4 w-4" />}
					size="featured"
					priority="operational"
					tooltip="Valeur moyenne des commandes ce mois"
				/>

				{/* A expedier */}
				<KpiCard
					title="A expedier"
					value={kpis.pendingShipment.count.toString()}
					numericValue={kpis.pendingShipment.count}
					icon={<Package className="h-4 w-4" />}
					size="featured"
					priority={kpis.pendingShipment.count > 0 ? "alert" : "info"}
					status={kpis.pendingShipment.count > 0 ? "warning" : "default"}
					href="/admin/ventes/commandes?filter_fulfillmentStatus=UNFULFILLED"
					tooltip="Commandes payees en attente d'expedition"
				/>
			</div>

			{/* Row 2: Compact operational KPI */}
			<div className="grid gap-4 sm:grid-cols-3">
				<KpiCard
					title="Taux de conversion"
					value={`${kpis.conversionRate.rate.toFixed(1)} %`}
					numericValue={kpis.conversionRate.rate}
					suffix=" %"
					decimalPlaces={1}
					evolution={kpis.conversionRate.evolution}
					comparisonLabel="vs mois dernier"
					icon={<Target className="h-4 w-4" />}
					size="compact"
					priority="operational"
					tooltip="Pourcentage de checkouts qui aboutissent a un paiement"
					subtitle={
						kpis.conversionRate.abandoned > 0
							? `${kpis.conversionRate.abandoned} checkout${kpis.conversionRate.abandoned > 1 ? "s" : ""} abandonne${kpis.conversionRate.abandoned > 1 ? "s" : ""}`
							: undefined
					}
				/>
			</div>
		</div>
	);
}
