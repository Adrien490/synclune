import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/shared/components/page-header";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { getAccountStats } from "@/modules/users/data/get-account-stats";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { AccountStatsCards } from "@/modules/users/components/account-stats-cards";
import { AccountStatsCardsSkeleton } from "@/modules/users/components/account-stats-cards-skeleton";
import { RecentOrders } from "@/modules/orders/components/recent-orders";
import { RecentOrdersSkeleton } from "@/modules/orders/components/recent-orders-skeleton";

export const metadata: Metadata = {
	title: "Tableau de bord",
};

export default async function DashboardPage() {
	const user = await getCurrentUser();
	if (!user) notFound();

	const firstName = user.name?.split(" ")[0] ?? "";

	return (
		<>
			<PageHeader
				title="Tableau de bord"
				description={`Bonjour ${firstName}`}
				variant="compact"
			/>

			<div className="space-y-6">
				<ErrorBoundary errorMessage="Impossible de charger les statistiques">
					<Suspense fallback={<AccountStatsCardsSkeleton />}>
						<AccountStatsCards
							statsPromise={getAccountStats()}
							memberSince={user.createdAt}
						/>
					</Suspense>
				</ErrorBoundary>

				<ErrorBoundary errorMessage="Impossible de charger les commandes">
					<Suspense fallback={<RecentOrdersSkeleton />}>
						<RecentOrders
							ordersPromise={getUserOrders({ perPage: 5 })}
							limit={5}
							showViewAll
						/>
					</Suspense>
				</ErrorBoundary>
			</div>
		</>
	);
}
