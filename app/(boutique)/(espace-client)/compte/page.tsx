import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
	AccountStatsCards,
	AccountStatsCardsSkeleton,
} from "@/modules/users/components/account-stats-cards";
import { QuickLinksCard } from "@/modules/users/components/quick-links-card";
import { AddressInfoCard } from "@/modules/users/components/address/address-info-card";
import { AddressInfoCardSkeleton } from "@/modules/users/components/address/address-info-card-skeleton";
import { getUserAddresses } from "@/modules/users/data/get-user-addresses";
import { RecentOrders } from "@/modules/orders/components/recent-orders";
import { RecentOrdersSkeleton } from "@/modules/orders/components/recent-orders-skeleton";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mon compte - Synclune",
	description:
		"Accédez à votre espace personnel Synclune. Gérez vos commandes, vos informations et découvrez vos bijoux préférés.",
	robots: {
		index: false,
		follow: true,
	},
	alternates: {
		canonical: "/compte",
	},
};

export default async function AccountPage() {
	const userPromise = getCurrentUser();
	const ordersPromise = getUserOrders({
		perPage: 5, // Fetch 5 but display only 3
		sortBy: "created-descending",
		direction: "forward",
	});
	const addressesPromise = getUserAddresses();

	const user = await userPromise;

	const breadcrumbs = [{ label: "Mon compte", href: "/compte" }];

	return (
		<>
			<PageHeader
				title="Mon compte"
				description="Gérez vos informations et suivez vos commandes"
				breadcrumbs={breadcrumbs}
			/>

			<section className="bg-background py-8 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Stats */}
					<Suspense fallback={<AccountStatsCardsSkeleton />}>
						<AccountStatsCards userPromise={getCurrentUser()} />
					</Suspense>

					{/* Contenu principal */}
					<div className="grid gap-6 lg:grid-cols-3 mt-6">
						{/* Commandes récentes - 2/3 */}
						<div className="lg:col-span-2">
							<Suspense fallback={<RecentOrdersSkeleton />}>
								<RecentOrders
									ordersPromise={ordersPromise}
									limit={3}
									showViewAll
								/>
							</Suspense>
						</div>

						{/* Sidebar - 1/3 */}
						<div className="space-y-6">
							{/* Profil */}
							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Profil</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-1">
										<p className="font-medium truncate">
											{user?.name || "Non défini"}
										</p>
										<p className="text-sm text-muted-foreground truncate">
											{user?.email || "Non défini"}
										</p>
									</div>
									<Button
										asChild
										variant="link"
										className="px-0 h-auto mt-2"
									>
										<Link href="/parametres">Modifier mes informations</Link>
									</Button>
								</CardContent>
							</Card>

							{/* Adresse par défaut */}
							<Suspense fallback={<AddressInfoCardSkeleton />}>
								<AddressInfoCard addressesPromise={addressesPromise} />
							</Suspense>

							{/* Navigation rapide */}
							<QuickLinksCard />
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
