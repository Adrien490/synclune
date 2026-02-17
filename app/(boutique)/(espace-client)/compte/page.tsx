import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import { AccountStatsCards } from "@/modules/users/components/account-stats-cards";
import { AccountStatsCardsSkeleton } from "@/modules/users/components/account-stats-cards-skeleton";
import { RecentOrders } from "@/modules/orders/components/recent-orders";
import { RecentOrdersSkeleton } from "@/modules/orders/components/recent-orders-skeleton";
import { AddressInfoCard } from "@/modules/addresses/components/address-info-card";
import { AddressInfoCardSkeleton } from "@/modules/addresses/components/address-info-card-skeleton";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { getUserAddresses } from "@/modules/addresses/data/get-user-addresses";
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
		perPage: 5,
		sortBy: "created-descending",
		direction: "forward",
	});

	const user = await userPromise;

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mon compte"
				description={`Bienvenue, ${user?.name?.split(" ")[0] || ""}`}
				breadcrumbs={[{ label: "Mon compte", href: "/compte" }]}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="space-y-6">
						{/* Stats */}
						<Suspense fallback={<AccountStatsCardsSkeleton />}>
							<AccountStatsCards userPromise={getCurrentUser()} />
						</Suspense>

						{/* Grille principale */}
						<div className="grid gap-6 lg:grid-cols-3">
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

							{/* Sidebar contenu - 1/3 */}
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
										<Link
											href="/parametres"
											className="text-sm text-foreground underline hover:text-foreground/80 mt-2 inline-block"
										>
											Modifier mes informations
										</Link>
									</CardContent>
								</Card>

								{/* Adresse par défaut */}
								<Suspense fallback={<AddressInfoCardSkeleton />}>
									<AddressInfoCard
										addressesPromise={getUserAddresses()}
									/>
								</Suspense>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
