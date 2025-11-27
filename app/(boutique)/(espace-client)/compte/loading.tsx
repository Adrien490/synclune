import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { AddressInfoCardSkeleton } from "@/modules/users/components/address/address-info-card-skeleton";
import { RecentOrdersSkeleton } from "@/modules/orders/components/recent-orders-skeleton";

export default function AccountDashboardLoading() {
	const breadcrumbs = [{ label: "Mon compte", href: "/compte" }];

	return (
		<>
			<PageHeader
				title="Mon compte"
				description="Gérez vos commandes et vos informations personnelles"
				breadcrumbs={breadcrumbs}
			/>

			<section className="bg-background py-8 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Navigation skeleton */}
					<div className="flex flex-wrap gap-3 mb-8">
						<Skeleton className="h-8 w-28" />
						<Skeleton className="h-8 w-32" />
						<Skeleton className="h-8 w-20" />
						<Skeleton className="h-8 w-24" />
						<Skeleton className="h-8 w-32" />
					</div>

					{/* Content grid */}
					<div className="grid gap-6 lg:grid-cols-3">
						{/* Commandes récentes - 2/3 */}
						<div className="lg:col-span-2">
							<RecentOrdersSkeleton />
						</div>

						{/* Sidebar - 1/3 */}
						<div className="space-y-6">
							{/* Profil skeleton */}
							<Card>
								<CardHeader>
									<Skeleton className="h-5 w-16" />
								</CardHeader>
								<CardContent>
									<div className="space-y-1">
										<Skeleton className="h-5 w-32" />
										<Skeleton className="h-4 w-48" />
									</div>
									<Skeleton className="h-4 w-40 mt-2" />
								</CardContent>
							</Card>

							{/* Adresse skeleton */}
							<AddressInfoCardSkeleton />
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
