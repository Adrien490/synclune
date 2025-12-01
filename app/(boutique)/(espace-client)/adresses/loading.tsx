import { PageHeader } from "@/shared/components/page-header";
import { AccountNav } from "@/modules/users/components/account-nav";
import { AddressListSkeleton } from "@/modules/addresses/components/address-list-skeleton";

export default function AddressesPageLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes adresses"
				description="Gérez vos adresses de livraison pour des commandes plus rapides"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Adresses", href: "/adresses" },
				]}
			/>

			<section className="bg-background py-6 sm:py-8 pb-24 lg:pb-8">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex gap-8">
						{/* Sidebar desktop */}
						<AccountNav variant="desktop-only" />

						{/* Contenu principal */}
						<div className="flex-1 min-w-0">
							<AddressListSkeleton />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
