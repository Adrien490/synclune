import { PageHeader } from "@/shared/components/page-header";
import { AddressListSkeleton } from "@/modules/addresses/components/address-list-skeleton";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";

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

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<AddressListSkeleton />
				</div>
			</section>
		</div>
	);
}
