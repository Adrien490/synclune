import { Clock, Euro, Package, Receipt, ShoppingBag, Star, Target } from "lucide-react";
import type { GetKpisReturn } from "@/modules/dashboard/data/get-kpis";
import ScrollFade from "@/shared/components/scroll-fade";
import { formatEuro } from "@/shared/utils/format-euro";
import { KpiCard } from "./kpi-card";
import { KpiCardAnimated } from "./kpi-card-animated";

function formatFulfillmentTime(hours: number): string {
	if (hours <= 0) return "—";
	if (hours < 24) return `${Math.round(hours)} h`;
	const days = hours / 24;
	return `${days.toFixed(1)} j`;
}

interface DashboardKpisProps {
	kpis: GetKpisReturn;
	comparisonLabel?: string;
}

/**
 * Dashboard KPIs grid - 4 featured + 4 compact
 * Row 1: CA net, Commandes, Panier moyen, À expédier (horizontal scroll on mobile)
 * Row 2: Taux de conversion, Note moyenne, Délai d'expédition (2-col on mobile)
 */
export function DashboardKpis({ kpis, comparisonLabel = "vs mois dernier" }: DashboardKpisProps) {
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
			{/* Row 1: 4 featured KPIs — horizontal scroll on mobile (with edge fades), grid on sm+.
			    `data-no-swipe-nav` opts this row out of the dashboard-level period-swipe
			    wrapper so the native snap-x horizontal scroll isn't hijacked. */}
			<div role="region" aria-label="Indicateurs clés ventes" data-no-swipe-nav>
				<ScrollFade axis="horizontal">
					<div className="flex snap-x snap-mandatory gap-4 pb-2 sm:grid sm:grid-cols-2 sm:pb-0 lg:grid-cols-4">
						<KpiCardAnimated index={0}>
							<div className="min-w-[72vw] shrink-0 snap-start sm:min-w-0 sm:shrink">
								<KpiCard
									title="CA net du mois"
									value={formatEuro(kpis.monthlyRevenue.netAmount, { compact: true })}
									numericValue={kpis.monthlyRevenue.netAmount}
									suffix=" €"
									evolution={kpis.monthlyRevenue.evolution}
									comparisonLabel={comparisonLabel}
									icon={<Euro className="h-4 w-4" />}
									size="featured"
									priority="critical"
									href="/admin/ventes/commandes?paymentStatus=PAID"
									tooltip="Chiffre d'affaires net (après remboursements) des commandes payées ce mois"
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
							</div>
						</KpiCardAnimated>

						<KpiCardAnimated index={1}>
							<div className="min-w-[72vw] shrink-0 snap-start sm:min-w-0 sm:shrink">
								<KpiCard
									title="Commandes"
									value={kpis.monthlyOrders.count.toString()}
									numericValue={kpis.monthlyOrders.count}
									evolution={kpis.monthlyOrders.evolution}
									comparisonLabel={comparisonLabel}
									icon={<ShoppingBag className="h-4 w-4" />}
									size="featured"
									priority="critical"
									href="/admin/ventes/commandes"
									tooltip="Nombre de commandes payées ce mois"
								/>
							</div>
						</KpiCardAnimated>

						<KpiCardAnimated index={2}>
							<div className="min-w-[72vw] shrink-0 snap-start sm:min-w-0 sm:shrink">
								<KpiCard
									title="Panier moyen"
									value={formatEuro(kpis.averageOrderValue.amount, { compact: true })}
									numericValue={kpis.averageOrderValue.amount}
									suffix=" €"
									evolution={kpis.averageOrderValue.evolution}
									comparisonLabel={comparisonLabel}
									icon={<Receipt className="h-4 w-4" />}
									size="featured"
									priority="operational"
									tooltip="Valeur moyenne des commandes ce mois"
								/>
							</div>
						</KpiCardAnimated>

						<KpiCardAnimated index={3}>
							<div className="min-w-[72vw] shrink-0 snap-start sm:min-w-0 sm:shrink">
								<KpiCard
									title="À expédier"
									value={kpis.pendingShipment.count.toString()}
									numericValue={kpis.pendingShipment.count}
									icon={<Package className="h-4 w-4" />}
									size="featured"
									priority={kpis.pendingShipment.count > 0 ? "alert" : "info"}
									status={kpis.pendingShipment.count > 0 ? "warning" : "default"}
									href="/admin/ventes/commandes?filter_fulfillmentStatus=UNFULFILLED"
									tooltip="Commandes payées en attente d'expédition"
								/>
							</div>
						</KpiCardAnimated>
					</div>
				</ScrollFade>
			</div>

			{/* Row 2: Compact operational KPIs — 2-col on mobile (flat), 3-col at lg+ (full card) */}
			<div className="grid grid-cols-2 gap-x-4 gap-y-1 md:gap-4 lg:grid-cols-3">
				<KpiCardAnimated index={4}>
					<KpiCard
						title="Taux de conversion"
						value={`${kpis.conversionRate.rate.toFixed(1)} %`}
						numericValue={kpis.conversionRate.rate}
						suffix=" %"
						decimalPlaces={1}
						evolution={kpis.conversionRate.evolution}
						comparisonLabel={comparisonLabel}
						icon={<Target className="h-4 w-4" />}
						size="compact"
						priority="operational"
						flatOnMobile
						tooltip="Pourcentage de checkouts qui aboutissent à un paiement"
						subtitle={
							kpis.conversionRate.abandoned > 0
								? `${kpis.conversionRate.abandoned} checkout${kpis.conversionRate.abandoned > 1 ? "s" : ""} abandonné${kpis.conversionRate.abandoned > 1 ? "s" : ""}`
								: undefined
						}
					/>
				</KpiCardAnimated>

				<KpiCardAnimated index={5}>
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
						flatOnMobile
						href="/admin/marketing/avis"
						tooltip="Note moyenne des avis clients publiés"
						subtitle={
							kpis.reviewHealth.totalReviews > 0
								? `${kpis.reviewHealth.totalReviews} avis`
								: "Aucun avis"
						}
					/>
				</KpiCardAnimated>

				<KpiCardAnimated index={6}>
					<KpiCard
						title="Délai d'expédition"
						value={formatFulfillmentTime(kpis.avgFulfillmentTime.hours)}
						numericValue={kpis.avgFulfillmentTime.hours}
						evolution={
							kpis.avgFulfillmentTime.hours > 0 ? kpis.avgFulfillmentTime.evolution : undefined
						}
						invertEvolutionColors
						comparisonLabel={comparisonLabel}
						icon={<Clock className="h-4 w-4" />}
						size="compact"
						priority="operational"
						flatOnMobile
						tooltip="Délai moyen entre le paiement et l'expédition"
					/>
				</KpiCardAnimated>
			</div>
		</div>
	);
}
