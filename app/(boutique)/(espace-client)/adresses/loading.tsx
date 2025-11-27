import { PageHeader } from "@/shared/components/page-header";
import { AddressListSkeleton } from "@/modules/users/components/address/address-list-skeleton";

export default function AddressesPageLoading() {
	const breadcrumbs = [
		{ label: "Mon compte", href: "/compte" },
		{ label: "Mes adresses", href: "/adresses" },
	];

	return (
		<>
			<PageHeader
				title="Mes adresses"
				description="Gérez vos adresses de livraison pour des commandes plus rapides"
				breadcrumbs={breadcrumbs}
			/>

			<section className="bg-background py-8 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<AddressListSkeleton />
				</div>
			</section>
		</>
	);
}
