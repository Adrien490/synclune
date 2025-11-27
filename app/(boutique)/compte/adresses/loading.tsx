import { PageHeader } from "@/shared/components/page-header";
import { AddressListSkeleton } from "@/modules/users/components/address/address-list-skeleton";

/**
 * Loading state for addresses page
 * Reproduit exactement la structure de la page addresses avec PageHeader et AddressListSkeleton
 */
export default function AddressesPageLoading() {
	return (
		<>
			{/* PageHeader avec breadcrumbs */}
			<PageHeader
				title="Mes adresses"
				description="Gérez vos adresses de livraison pour des commandes plus rapides"
				breadcrumbs={[
					{ label: "Mon compte", href: "/account" },
					{ label: "Mes adresses", href: "/account/addresses" },
				]}
			/>

			<section className="bg-background py-8">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<AddressListSkeleton />
				</div>
			</section>
		</>
	);
}
