import { Suspense } from "react";
import { fetchCustomerKpis } from "../../data/get-customer-kpis";
import { fetchRepeatCustomers } from "../../data/get-repeat-customers";
import { fetchTopCustomers } from "../../data/get-top-customers";
import { CustomerKpis } from "./customer-kpis";
import { RepeatVsNewChart } from "./repeat-vs-new-chart";
import { TopCustomersList } from "./top-customers-list";
import { KpisSkeleton, ChartSkeleton } from "../skeletons";
import type { DashboardPeriod } from "../../utils/period-resolver";

interface CustomersSectionProps {
	period: DashboardPeriod;
	fromDate?: string;
	toDate?: string;
}

/**
 * Section Clients du dashboard
 * Affiche les KPIs clients, la repartition nouveaux/recurrents et les meilleurs clients
 */
export async function CustomersSection({
	period,
	fromDate,
	toDate,
}: CustomersSectionProps) {
	// Parser les dates custom si presentes
	const customStartDate = fromDate ? new Date(fromDate) : undefined;
	const customEndDate = toDate ? new Date(toDate) : undefined;

	// Creer les promises pour les donnees
	const kpisPromise = fetchCustomerKpis(period, customStartDate, customEndDate);
	const repeatCustomersPromise = fetchRepeatCustomers(period, customStartDate, customEndDate);
	const topCustomersPromise = fetchTopCustomers(period, customStartDate, customEndDate, 5);

	return (
		<div className="space-y-6">
			{/* KPIs Clients */}
			<Suspense fallback={<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs clients" />}>
				<CustomerKpis kpisPromise={kpisPromise} />
			</Suspense>

			{/* Graphiques et listes */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Suspense fallback={<ChartSkeleton />}>
					<RepeatVsNewChart chartPromise={repeatCustomersPromise} />
				</Suspense>

				<Suspense fallback={<ChartSkeleton />}>
					<TopCustomersList listPromise={topCustomersPromise} />
				</Suspense>
			</div>
		</div>
	);
}
