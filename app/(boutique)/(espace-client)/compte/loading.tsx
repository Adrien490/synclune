import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { AccountStatsCardsSkeleton } from "@/modules/users/components/account-stats-cards";
import { RecentOrdersSkeleton } from "@/modules/orders/components/recent-orders-skeleton";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";

export default function AccountDashboardLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mon compte"
				breadcrumbs={[{ label: "Mon compte", href: "/compte" }]}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="space-y-6">
						{/* Stats skeleton */}
						<AccountStatsCardsSkeleton />

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
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
