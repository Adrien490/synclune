import {
	CurrencyEurIcon,
	PackageIcon,
	ReceiptIcon,
	ShoppingBagIcon,
	TargetIcon,
	UserPlusIcon,
} from "@phosphor-icons/react/ssr";
import type { GetKpisReturn } from "@/modules/dashboard/data/get-kpis";
import { formatEuro } from "@/shared/utils/format-euro";
import { KpiCard } from "./kpi-card";
import { KpiCardAnimated } from "./kpi-card-animated";
import { ORDERS_TO_SHIP_HREF } from "@/modules/orders/constants/to-ship";

interface DashboardKpisProps {
	kpis: GetKpisReturn;
}

/**
 * Dashboard KPIs grid — mois en cours, valeurs brutes.
 * Row 1 : CA net, Commandes, Panier moyen, À expédier (scroll horizontal mobile).
 * Row 2 : Finalisation panier, Nouveaux clients (2 colonnes mobile).
 *
 * Lot 4 SIMPLIFICATION.md S3.5 (2026-08-03) : plus de sparklines, d'évolutions
 * « vs période précédente » ni de délai moyen d'expédition — les courbes et
 * comparaisons vivent dans le dashboard Stripe ; ici ne restent que les chiffres
 * du mois sous l'angle Synclune (CA net après remboursements, file à expédier).
 */
export function DashboardKpis({ kpis }: DashboardKpisProps) {
	const hasRefunds = kpis.monthlyRevenue.refundCount > 0;
	const refundRate = kpis.monthlyRevenue.refundRate;

	const revenueSubtitleParts: string[] = [];
	if (hasRefunds) {
		revenueSubtitleParts.push(
			`-${formatEuro(kpis.monthlyRevenue.refundAmount)} remb. (${refundRate.toFixed(1)}%)`,
		);
	}
	const revenueSubtitle =
		revenueSubtitleParts.length > 0 ? revenueSubtitleParts.join(" · ") : undefined;

	const revenuePriority: "critical" | "alert" = refundRate >= 10 ? "alert" : "critical";

	return (
		<div className="space-y-4">
			{/* Row 1: 4 featured KPIs — horizontal scroll on mobile (with edge fades), grid on sm+. */}
			<div>
				{/* `role="region"` + `tabIndex` : les cartes KPI ne sont pas toutes
				 * focusables (seules celles qui portent un `href` le sont), donc sans ce
				 * point d'entrée la rangée ne serait pas atteignable aux flèches.
				 *
				 * `sm:scroll-fade-none` : à partir de `sm` la rangée devient une GRILLE,
				 * qui ne déborde plus. Les navigateurs qui gèrent `animation-timeline`
				 * n'affichent alors aucun fondu d'eux-mêmes, mais le repli
				 * `@supports not` de `scroll-fade.css` peint un fondu STATIQUE — il
				 * estomperait les bords d'une grille qui ne défile pas. */}
				<div
					data-slot="scroll-fade-container"
					data-no-edge-swipe=""
					role="region"
					aria-label="Indicateurs clés ventes"
					// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable to be scrollable by keyboard (WCAG 2.1.1); the rule only whitelists `tabpanel`
					tabIndex={0}
					className="focus-ring scroll-fade-x no-scrollbar sm:scroll-fade-none w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
				>
					<div className="flex w-fit min-w-full snap-x snap-mandatory gap-4 pb-2 sm:grid sm:grid-cols-2 sm:pb-0 lg:grid-cols-4">
						<KpiCardAnimated index={0}>
							<div className="min-w-[72vw] shrink-0 snap-start sm:min-w-0 sm:shrink">
								<KpiCard
									title="CA net du mois"
									value={formatEuro(kpis.monthlyRevenue.netAmount, { compact: true })}
									numericValue={kpis.monthlyRevenue.netAmount}
									suffix=" €"
									icon={<CurrencyEurIcon className="size-4" />}
									size="featured"
									priority={revenuePriority}
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
									icon={<ShoppingBagIcon className="size-4" />}
									size="featured"
									priority="critical"
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
									icon={<ReceiptIcon className="size-4" />}
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
									icon={<PackageIcon className="size-4" />}
									size="featured"
									priority={kpis.pendingShipment.count > 0 ? "alert" : "info"}
									status={kpis.pendingShipment.count > 0 ? "warning" : "default"}
									tooltip="Commandes payées en attente d'expédition"
									// Le seul KPI qui désigne une FILE DE TRAVAIL et non une mesure :
									// il doit mener aux commandes qu'il compte. Pas de lien quand la
									// file est vide : rien à aller voir.
									href={kpis.pendingShipment.count > 0 ? ORDERS_TO_SHIP_HREF : undefined}
								/>
							</div>
						</KpiCardAnimated>
					</div>
				</div>
			</div>

			{/* Row 2: Compact operational KPIs — 2-col on mobile (flat), lg+ full card */}
			<div className="grid grid-cols-2 gap-x-4 gap-y-1 md:gap-4 lg:grid-cols-4">
				<KpiCardAnimated index={4}>
					<KpiCard
						title="Finalisation panier"
						value={`${kpis.conversionRate.rate.toFixed(1)} %`}
						numericValue={kpis.conversionRate.rate}
						suffix=" %"
						decimalPlaces={1}
						icon={<TargetIcon className="size-4" />}
						size="compact"
						priority="operational"
						flatOnMobile
						tooltip="Pourcentage de paniers créés qui aboutissent à un paiement (hors visiteurs sans panier — non mesuré)"
						subtitle={
							kpis.conversionRate.abandoned > 0
								? `${kpis.conversionRate.abandoned} checkout${kpis.conversionRate.abandoned > 1 ? "s" : ""} abandonné${kpis.conversionRate.abandoned > 1 ? "s" : ""}`
								: undefined
						}
					/>
				</KpiCardAnimated>

				<KpiCardAnimated index={5}>
					<KpiCard
						title="Nouveaux clients"
						value={kpis.newCustomers.count.toString()}
						numericValue={kpis.newCustomers.count}
						icon={<UserPlusIcon className="size-4" />}
						size="compact"
						priority="info"
						flatOnMobile
						tooltip="Clients dont la première commande payée tombe dans le mois"
					/>
				</KpiCardAnimated>
			</div>
		</div>
	);
}
