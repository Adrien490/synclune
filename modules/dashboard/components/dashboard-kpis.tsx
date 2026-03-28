import { Clock, Euro, Mail, Package, Receipt, ShoppingBag, Star, Target } from "lucide-react";
import type { GetKpisReturn } from "@/modules/dashboard/data/get-kpis";
import type { KpiSparklines } from "@/modules/dashboard/data/get-kpi-sparklines";
import { formatEuro } from "@/shared/utils/format-euro";
import { KpiCard } from "./kpi-card";

function formatFulfillmentTime(hours: number): string {
	if (hours <= 0) return "—";
	if (hours < 24) return `${Math.round(hours)} h`;
	const days = hours / 24;
	return `${days.toFixed(1)} j`;
}

interface DashboardKpisProps {
	kpis: GetKpisReturn;
	sparklines?: KpiSparklines;
}

/**
 * Dashboard KPIs grid - 4 featured + 1 compact
 * Row 1: CA net, Commandes, Panier moyen, A expedier
 * Row 2: Taux de conversion
 */
export function DashboardKpis({ kpis, sparklines }: DashboardKpisProps) {
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
					sparklinePath={sparklines?.revenuePath}
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
					sparklinePath={sparklines?.ordersPath}
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
					sparklinePath={sparklines?.aovPath}
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

			{/* Row 2: Compact operational KPIs */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

				<KpiCard
					title="Note moyenne"
					value={
						kpis.reviewHealth.totalReviews > 0
							? `${kpis.reviewHealth.averageRating.toFixed(1)} / 5`
							: "—"
					}
					numericValue={kpis.reviewHealth.averageRating}
					icon={<Star className="h-4 w-4" />}
					size="compact"
					priority="info"
					href="/admin/marketing/avis"
					tooltip="Note moyenne des avis clients publies"
					subtitle={
						kpis.reviewHealth.totalReviews > 0
							? `${kpis.reviewHealth.totalReviews} avis`
							: "Aucun avis"
					}
				/>

				<KpiCard
					title="Abonnes newsletter"
					value={kpis.newsletterGrowth.totalActive.toString()}
					numericValue={kpis.newsletterGrowth.totalActive}
					evolution={kpis.newsletterGrowth.evolution}
					comparisonLabel="vs mois dernier"
					icon={<Mail className="h-4 w-4" />}
					size="compact"
					priority="info"
					href="/admin/marketing/newsletter"
					tooltip="Nombre d'abonnes newsletter confirmes"
					subtitle={
						kpis.newsletterGrowth.newThisMonth > 0
							? `+${kpis.newsletterGrowth.newThisMonth} ce mois`
							: undefined
					}
				/>

				<KpiCard
					title="Delai d'expedition"
					value={formatFulfillmentTime(kpis.avgFulfillmentTime.hours)}
					numericValue={kpis.avgFulfillmentTime.hours}
					evolution={
						kpis.avgFulfillmentTime.hours > 0 ? kpis.avgFulfillmentTime.evolution : undefined
					}
					invertEvolutionColors
					comparisonLabel="vs mois dernier"
					icon={<Clock className="h-4 w-4" />}
					size="compact"
					priority="operational"
					tooltip="Delai moyen entre le paiement et l'expedition"
				/>
			</div>
		</div>
	);
}
