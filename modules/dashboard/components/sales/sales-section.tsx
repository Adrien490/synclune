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
			<Suspense fallback={<KpisSkeleton />}>
				<SalesKpis kpisPromise={salesKpisPromise} />
			</Suspense>

			{/* Taux d'abandon et Stats promos */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Suspense fallback={<ChartSkeleton />}>
					<CartAbandonmentCard dataPromise={abandonmentPromise} />
				</Suspense>

				<Suspense fallback={<ChartSkeleton />}>
					<DiscountStatsCard dataPromise={discountStatsPromise} />
				</Suspense>
			</div>

			{/* Graphiques revenus */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Suspense fallback={<ChartSkeleton />}>
					<RevenueByCollectionChart dataPromise={revenueByCollectionPromise} />
				</Suspense>

				<Suspense fallback={<ChartSkeleton />}>
					<RevenueByTypeChart dataPromise={revenueByTypePromise} />
				</Suspense>
			</div>
		</div>
	);
}
