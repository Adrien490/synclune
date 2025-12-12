import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import { searchAddress } from "@/modules/addresses/actions/search-address";
import { getUserAddresses } from "@/modules/addresses/data/get-user-addresses";
import { AddressFormDialog } from "@/modules/addresses/components/address-form-dialog";
import { AddressList } from "@/modules/addresses/components/address-list";
import { AddressListSkeleton } from "@/modules/addresses/components/address-list-skeleton";
import { DeleteAddressAlertDialog } from "@/modules/addresses/components/delete-address-alert-dialog";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Mes adresses | Synclune",
	description: "Gérez vos adresses de livraison",
	robots: {
		index: false,
		follow: true,
	},
};

interface AddressesPageProps {
	searchParams: Promise<{
		q?: string;
	}>;
}

/**
 * Page de gestion des adresses utilisateur
 * Permet d'ajouter, modifier, supprimer et définir une adresse par défaut
 * Intègre l'API d'autocomplétion d'adresses via searchParams
 */
export default async function AddressesPage({
	searchParams,
}: AddressesPageProps) {
	const params = await searchParams;
	const addressQuery = params.q || "";

	const addressesPromise = getUserAddresses();

	const addressSuggestions =
		addressQuery.length >= 3
			? await searchAddress({ text: addressQuery, maximumResponses: 5 })
			: { addresses: [], query: "", limit: 0 };

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
					<Suspense fallback={<AddressListSkeleton />}>
						<AddressList addressesPromise={addressesPromise} />
					</Suspense>
				</div>
			</section>

			{/* Dialog for creating/editing addresses with address suggestions */}
			<AddressFormDialog addressSuggestions={addressSuggestions.addresses} />

			{/* Alert dialog for deleting addresses */}
			<DeleteAddressAlertDialog />
		</div>
	);
}
