import { Suspense } from "react";
import type { DashboardPeriod } from "../../utils/period-resolver";
import { fetchSalesKpis } from "../../data/get-sales-kpis";
import { fetchCartAbandonment } from "../../data/get-cart-abandonment";
import { fetchRevenueByCollection } from "../../data/get-revenue-by-collection";
import { fetchRevenueByType } from "../../data/get-revenue-by-type";
import { fetchDiscountStats } from "../../data/get-discount-stats";
import { SalesKpis } from "./sales-kpis";
import { CartAbandonmentCard } from "./cart-abandonment-card";
import { RevenueByCollectionChart } from "./revenue-by-collection-chart";
import { RevenueByTypeChart } from "./revenue-by-type-chart";
import { DiscountStatsCard } from "./discount-stats-card";
import { KpisSkeleton, ChartSkeleton } from "../skeletons";
import { DashboardErrorBoundary } from "../dashboard-error-boundary";
import { ChartError } from "../chart-error";

interface SalesSectionProps {
	period: DashboardPeriod;
	fromDate?: string;
	toDate?: string;
}

/**
 * Section Ventes & Conversions du dashboard
 */
export async function SalesSection({
	period,
	fromDate,
	toDate,
}: SalesSectionProps) {
	// Parser les dates custom si presentes
	const customStartDate = fromDate ? new Date(fromDate) : undefined;
	const customEndDate = toDate ? new Date(toDate) : undefined;

	// Creer les promises pour les donnees
	const salesKpisPromise = fetchSalesKpis(period, customStartDate, customEndDate);
	const abandonmentPromise = fetchCartAbandonment(period, customStartDate, customEndDate);
	const revenueByCollectionPromise = fetchRevenueByCollection(period, customStartDate, customEndDate);
	const revenueByTypePromise = fetchRevenueByType(period, customStartDate, customEndDate);
	const discountStatsPromise = fetchDiscountStats(period, customStartDate, customEndDate);

	return (
		<div className="space-y-6">
			{/* KPIs Ventes */}
			<DashboardErrorBoundary
				fallback={<ChartError title="Erreur" description="Impossible de charger les indicateurs de ventes" minHeight={140} />}
			>
				<Suspense fallback={<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs de ventes" />}>
					<SalesKpis kpisPromise={salesKpisPromise} />
				</Suspense>
			</DashboardErrorBoundary>

			{/* Taux d'abandon et Stats promos */}
			<div className="grid gap-6 lg:grid-cols-2">
				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur" description="Impossible de charger le taux d'abandon" />}
				>
					<Suspense fallback={<ChartSkeleton />}>
						<CartAbandonmentCard dataPromise={abandonmentPromise} />
					</Suspense>
				</DashboardErrorBoundary>

				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur" description="Impossible de charger les stats promos" />}
				>
					<Suspense fallback={<ChartSkeleton />}>
						<DiscountStatsCard dataPromise={discountStatsPromise} />
					</Suspense>
				</DashboardErrorBoundary>
			</div>

			{/* Graphiques revenus */}
			<div className="grid gap-6 lg:grid-cols-2">
				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur" description="Impossible de charger les revenus par collection" />}
				>
					<Suspense fallback={<ChartSkeleton />}>
						<RevenueByCollectionChart chartDataPromise={revenueByCollectionPromise} />
					</Suspense>
				</DashboardErrorBoundary>

				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur" description="Impossible de charger les revenus par type" />}
				>
					<Suspense fallback={<ChartSkeleton />}>
						<RevenueByTypeChart chartDataPromise={revenueByTypePromise} />
					</Suspense>
				</DashboardErrorBoundary>
			</div>
		</div>
	);
}
