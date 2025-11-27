import { PageHeader } from "@/shared/components/page-header";
import { AddressInfoCardSkeleton } from "@/modules/users/components/address/address-info-card-skeleton";
import { ProfileInfoCardSkeleton } from "@/modules/users/components/profile-info-card-skeleton";
import { RecentOrdersSkeleton } from "@/modules/orders/components/recent-orders-skeleton";

/**
 * Loading state for account dashboard page
 * Matches the exact structure of page.tsx:
 * - PageHeader
 * - Grid lg:grid-cols-3 with RecentOrders (col-span-2) + ProfileInfo + AddressInfo (col-span-1)
 */
export default function AccountDashboardLoading() {
	return (
		<>
			{/* Header avec breadcrumbs */}
			<PageHeader
				title="Mon compte"
				description="Gérez vos commandes et vos informations personnelles"
				breadcrumbs={[{ label: "Mon compte", href: "/account" }]}
			/>

			{/* Contenu de la page */}
			<section className="bg-background py-8">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid gap-6 lg:grid-cols-3">
						{/* Commandes - 2/3 de la largeur sur desktop */}
						<div className="lg:col-span-2">
							<RecentOrdersSkeleton />
						</div>

						{/* Profil - 1/3 de la largeur sur desktop */}
						<div className="space-y-6">
							<ProfileInfoCardSkeleton />
							<AddressInfoCardSkeleton />
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
