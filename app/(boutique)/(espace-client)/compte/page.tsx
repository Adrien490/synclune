import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Heart, Package, Settings } from "lucide-react";
import { PageHeader } from "@/shared/components/page-header";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { getAccountStats } from "@/modules/users/data/get-account-stats";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { AccountStatsCards } from "@/modules/users/components/account-stats-cards";
import { AccountStatsCardsSkeleton } from "@/modules/users/components/account-stats-cards-skeleton";
import { RecentOrders } from "@/modules/orders/components/recent-orders";
import { RecentOrdersSkeleton } from "@/modules/orders/components/recent-orders-skeleton";
import { ROUTES } from "@/shared/constants/urls";

export const metadata: Metadata = {
	title: "Tableau de bord",
};

const quickLinks = [
	{ href: ROUTES.ACCOUNT.ORDERS, label: "Mes commandes", icon: Package },
	{ href: ROUTES.ACCOUNT.FAVORITES, label: "Mes favoris", icon: Heart },
	{ href: ROUTES.ACCOUNT.SETTINGS, label: "Paramètres", icon: Settings },
];

export default async function DashboardPage() {
	const user = await getCurrentUser();
	if (!user) notFound();

	const firstName = user.name?.split(" ")[0] ?? "";

	return (
		<>
			<PageHeader title="Tableau de bord" description={`Bonjour ${firstName}`} variant="compact" />

			<div className="space-y-6">
				<ErrorBoundary errorMessage="Impossible de charger les statistiques">
					<Suspense fallback={<AccountStatsCardsSkeleton />}>
						<AccountStatsCards statsPromise={getAccountStats()} memberSince={user.createdAt} />
					</Suspense>
				</ErrorBoundary>

				<section>
					<h2 className="mb-3 text-lg/7 font-semibold tracking-tight antialiased">Liens rapides</h2>
					<div className="grid gap-3 sm:grid-cols-3">
						{quickLinks.map(({ href, label, icon: Icon }) => (
							<Link
								key={href}
								href={href}
								className="group border-border/60 hover:bg-muted flex items-center gap-3 rounded-xl border p-4 transition-colors"
							>
								<Icon className="text-muted-foreground size-5" />
								<span className="font-medium">{label}</span>
								<ChevronRight className="text-muted-foreground ml-auto size-4 transition-transform group-hover:translate-x-0.5" />
							</Link>
						))}
					</div>
				</section>

				<ErrorBoundary errorMessage="Impossible de charger les commandes">
					<Suspense fallback={<RecentOrdersSkeleton />}>
						<RecentOrders ordersPromise={getUserOrders({ perPage: 5 })} limit={5} showViewAll />
					</Suspense>
				</ErrorBoundary>
			</div>
		</>
	);
}
